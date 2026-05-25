import { unstable_cache } from 'next/cache';
import { getServerSupabase } from './supabase';
import type { MetricsWindow } from './metrics';

function cachedByWindow<T>(
  key: string,
  fn: (window: MetricsWindow) => Promise<T>,
): (window: MetricsWindow) => Promise<T> {
  return (window) =>
    unstable_cache(
      () => fn(window),
      [key, window.startDate, window.endDate],
      { revalidate: 300, tags: ['dashboard'] },
    )();
}

// ============================================================
// Operations KPIs — window-aware
// ============================================================
export type OpsKpis = {
  openJobs: number;
  scheduledToday: number;
  completedToday: number;
  completedThisWeek: number;
  avgJobValue: number | null;
  avgResponseMin: number | null;
  firstTimeFix: number | null;
  techUtil: number | null;
  techCount: number;
  avgHoursPerJob: number | null;
};

export const getOpsKpis = cachedByWindow('ops-kpis-v3-window', async (window): Promise<OpsKpis> => {
  const sb = getServerSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);

  const [openRes, todayCompletedRes, weekCompletedRes, avgRes, scheduleRes, staffRes] = await Promise.all([
    sb.from('simpro_jobs').select('id', { count: 'exact', head: true }).eq('is_complete', false),
    sb.from('simpro_jobs').select('id', { count: 'exact', head: true })
      .eq('is_complete', true)
      .gte('date_completed', today)
      .lte('date_completed', today),
    sb.from('simpro_jobs').select('total_ex_tax', { count: 'exact' })
      .eq('is_complete', true)
      .gte('date_completed', weekStart)
      .lte('date_completed', today),
    sb.from('simpro_jobs').select('total_ex_tax, labor_hours')
      .eq('is_complete', true)
      .gte('date_completed', window.startDate)
      .lte('date_completed', window.endDate),
    sb.from('simpro_schedules')
      .select('staff_id, total_hours')
      .gte('date', window.startDate)
      .lte('date', window.endDate),
    sb.from('simpro_staff')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'employee'),
  ]);
  if (openRes.error) throw new Error(openRes.error.message);
  if (todayCompletedRes.error) throw new Error(todayCompletedRes.error.message);
  if (weekCompletedRes.error) throw new Error(weekCompletedRes.error.message);
  if (avgRes.error) throw new Error(avgRes.error.message);

  const recent = avgRes.data ?? [];
  const totalRecent = recent.reduce((s, r) => s + Number(r.total_ex_tax ?? 0), 0);
  const avgJobValue = recent.length > 0 ? totalRecent / recent.length : null;
  const totalLaborHours = recent.reduce((s, r) => s + Number(r.labor_hours ?? 0), 0);
  const avgHoursPerJob = recent.length > 0 && totalLaborHours > 0
    ? totalLaborHours / recent.length
    : null;

  // Utilisation: scheduled-hours per tech vs available-hours within the window.
  // Available = active techs × 8h × (window working-days estimate ≈ 22/30 of days).
  const scheduleRows = scheduleRes.data ?? [];
  const hoursByStaff = new Map<number, number>();
  for (const r of scheduleRows) {
    if (r.staff_id == null) continue;
    hoursByStaff.set(Number(r.staff_id), (hoursByStaff.get(Number(r.staff_id)) ?? 0) + Number(r.total_hours ?? 0));
  }
  const activeTechs = hoursByStaff.size;
  const scheduledHours = [...hoursByStaff.values()].reduce((a, b) => a + b, 0);
  const winDays = Math.max(1, Math.round((+new Date(window.endDate + 'T00:00:00Z') - +new Date(window.startDate + 'T00:00:00Z')) / 86_400_000) + 1);
  const workingDays = Math.max(1, Math.round(winDays * 22 / 30));
  const availableHours = activeTechs * 8 * workingDays;
  const techUtil = activeTechs > 0 && availableHours > 0
    ? Math.min(1, scheduledHours / availableHours)
    : null;
  const techCount = staffRes.count ?? activeTechs;

  return {
    openJobs: openRes.count ?? 0,
    scheduledToday: 0,
    completedToday: todayCompletedRes.count ?? 0,
    completedThisWeek: weekCompletedRes.count ?? 0,
    avgJobValue,
    avgResponseMin: null,
    firstTimeFix: null,
    techUtil,
    techCount,
    avgHoursPerJob,
  };
});

// ============================================================
// Hourly job-load distribution — within the window
// ============================================================
export type HourlyBucket = { hour: string; jobs: number };

export const getHourlyLoad = cachedByWindow('ops-hourly-load-v2-window', async (window): Promise<HourlyBucket[]> => {
  const sb = getServerSupabase();
  const PAGE = 1000;
  const dates: string[] = [];
  for (let from = 0; from < 30_000; from += PAGE) {
    const { data, error } = await sb
      .from('simpro_jobs')
      .select('date_created, raw')
      .gte('date_created', window.startDate)
      .lte('date_created', window.endDate + 'T23:59:59')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) {
      const raw = (r.raw ?? {}) as Record<string, unknown>;
      const dm = typeof raw.DateModified === 'string' ? raw.DateModified : null;
      if (dm) dates.push(dm);
    }
    if (rows.length < PAGE) break;
  }

  const buckets = new Map<number, number>();
  for (let h = 7; h <= 18; h++) buckets.set(h, 0);
  for (const ts of dates) {
    const d = new Date(ts);
    const h = d.getHours();
    if (buckets.has(h)) buckets.set(h, (buckets.get(h) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, jobs]) => ({
      hour: `${hour}${hour < 12 ? 'am' : 'pm'}`,
      jobs,
    }));
});

// ============================================================
// Status distribution (point-in-time snapshot of open jobs)
// ============================================================
export type StatusBucket = { status: string; count: number };

export const getStatusDistribution = unstable_cache(
  async (): Promise<StatusBucket[]> => {
    const sb = getServerSupabase();
    const PAGE = 1000;
    const seen = new Map<string, number>();
    for (let from = 0; from < 30_000; from += PAGE) {
      const { data, error } = await sb
        .from('simpro_jobs')
        .select('status')
        .eq('is_complete', false)
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      for (const r of rows) {
        const k = r.status || 'Unknown';
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
      if (rows.length < PAGE) break;
    }
    return [...seen.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  },
  ['ops-status-dist-v1'],
  { revalidate: 300, tags: ['dashboard'] },
);
