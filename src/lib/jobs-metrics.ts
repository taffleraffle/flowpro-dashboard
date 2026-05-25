import { unstable_cache } from 'next/cache';
import { getServerSupabase } from './supabase';
import type { MetricsWindow } from './metrics';

// ============================================================
// Job-specific aggregators. Most of this is SimPro-dependent, so
// expect empty rows until the 503 unblocks.
// ============================================================

export type JobsKpis = {
  active: number;            // open jobs (not paid/closed)
  activeValue: number;
  scheduledToday: number;
  completed30d: number | null; // null = waiting on SimPro
  highUrgency: number;
  avgTicket: number | null;
  onTimePct: number | null;  // requires tech timing data
};

export function getJobsKpis(window: MetricsWindow): Promise<JobsKpis> {
  return unstable_cache(
    async (): Promise<JobsKpis> => {
      const sb = getServerSupabase();
      const today = new Date().toISOString().slice(0, 10);

      const [activeRes, scheduledTodayRes, completedRes] = await Promise.all([
        sb.from('simpro_jobs')
          .select('id, total_ex_tax', { count: 'exact' })
          .eq('is_complete', false),
        sb.from('simpro_jobs')
          .select('id', { count: 'exact', head: true })
          .gte('date_created', today)
          .lte('date_created', today + 'T23:59:59'),
        sb.from('simpro_jobs')
          .select('total_ex_tax', { count: 'exact' })
          .eq('is_complete', true)
          .gte('date_completed', window.startDate)
          .lte('date_completed', window.endDate),
      ]);
      if (activeRes.error) throw new Error(activeRes.error.message);
      if (scheduledTodayRes.error) throw new Error(scheduledTodayRes.error.message);
      if (completedRes.error) throw new Error(completedRes.error.message);

      const active = activeRes.count ?? 0;
      const activeValue = (activeRes.data ?? []).reduce((s, j) => s + Number(j.total_ex_tax ?? 0), 0);
      const completedCount = completedRes.count ?? 0;
      const completedRevenue = (completedRes.data ?? []).reduce((s, j) => s + Number(j.total_ex_tax ?? 0), 0);

      return {
        active,
        activeValue,
        scheduledToday: scheduledTodayRes.count ?? 0,
        // Null when there's genuinely no SimPro data — empty `simpro_jobs` table
        // shouldn't lie as "0 jobs completed". This lets the UI show "—".
        completed30d: completedCount > 0 ? completedCount : null,
        highUrgency: 0, // requires SimPro urgency field
        avgTicket: completedCount > 0 ? completedRevenue / completedCount : null,
        onTimePct: null, // requires tech timing
      };
    },
    ['jobs-kpis-v2-window', window.startDate, window.endDate],
    { revalidate: 300, tags: ['dashboard'] },
  )();
}

// ============================================================
// Pipeline stages — group all simpro_jobs by their status name.
// Returns an empty Map when no SimPro data exists.
// ============================================================
export type PipelineJob = {
  id: number;
  title: string;
  customer: string | null;
  site: string | null;
  type: string | null;
  value: number;
};

export type PipelineStage = { stage: string; jobs: PipelineJob[]; value: number };

const STAGE_ORDER = ['Inquiry', 'Quoted', 'Scheduled', 'On Site', 'Invoiced', 'Paid'];

export const getPipeline = unstable_cache(
  async (): Promise<PipelineStage[]> => {
    const sb = getServerSupabase();
    const { data, error } = await sb
      .from('simpro_jobs')
      .select('id, status, total_ex_tax, site_address, customer_id, raw')
      .eq('is_complete', false)
      .order('date_created', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const grouped = new Map<string, PipelineJob[]>();
    for (const j of data ?? []) {
      const stage = j.status ?? 'Inquiry';
      const arr = grouped.get(stage) ?? [];
      const raw = (j.raw ?? {}) as Record<string, unknown>;
      arr.push({
        id: j.id,
        title: (typeof raw.Description === 'string' ? raw.Description : `Job ${j.id}`),
        customer: null,
        site: j.site_address,
        type: stage,
        value: Number(j.total_ex_tax ?? 0),
      });
      grouped.set(stage, arr);
    }

    // Return stages in canonical order; include empty ones for layout stability
    return STAGE_ORDER.map(stage => ({
      stage,
      jobs: grouped.get(stage) ?? [],
      value: (grouped.get(stage) ?? []).reduce((s, j) => s + j.value, 0),
    }));
  },
  ['jobs-pipeline-v1'],
  { revalidate: 300, tags: ['dashboard'] },
);

// ============================================================
// Job types breakdown — by status as a proxy until SimPro adds
// a real `job_category` column. Used by JobTypesTable.
// ============================================================
export type JobTypeRow = {
  type: string;
  count: number;
  avgValue: number;
  totalRevenue: number;
};

// Window-keyed cache so different periods don't collide.
export function getJobTypes(window: MetricsWindow): Promise<JobTypeRow[]> {
  return unstable_cache(
    async (): Promise<JobTypeRow[]> => {
      const sb = getServerSupabase();
      const { data, error } = await sb
        .from('simpro_jobs')
        .select('status, total_ex_tax, is_complete')
        .eq('is_complete', true)
        .gte('date_completed', window.startDate)
        .lte('date_completed', window.endDate);
      if (error) throw new Error(error.message);

      const grouped = new Map<string, { count: number; revenue: number }>();
      for (const r of data ?? []) {
        const key = r.status || 'Other';
        const g = grouped.get(key) ?? { count: 0, revenue: 0 };
        g.count += 1;
        g.revenue += Number(r.total_ex_tax ?? 0);
        grouped.set(key, g);
      }
      return [...grouped.entries()]
        .map(([type, g]) => ({
          type,
          count: g.count,
          avgValue: g.count > 0 ? g.revenue / g.count : 0,
          totalRevenue: g.revenue,
        }))
        .sort((a, b) => b.count - a.count);
    },
    ['jobs-types-v1', window.startDate, window.endDate],
    { revalidate: 300, tags: ['dashboard'] },
  )();
}

// ============================================================
// All-jobs list for the bottom table. Returns the most recent
// `limit` jobs ordered by date_created desc.
// ============================================================
export type JobRow = {
  id: number;
  title: string;
  status: string | null;
  site_address: string | null;
  total_ex_tax: number;
  is_complete: boolean;
  date_created: string | null;
  date_completed: string | null;
  distance_km: number | null;
};

export function getAllJobs(window: MetricsWindow, limit = 60): Promise<JobRow[]> {
  return unstable_cache(
    async (): Promise<JobRow[]> => {
      const sb = getServerSupabase();
      const { data, error } = await sb
        .from('simpro_jobs')
        .select('id, status, total_ex_tax, is_complete, date_created, date_completed, site_address, distance_km, raw')
        .gte('date_created', window.startDate)
        .lte('date_created', window.endDate)
        .order('date_created', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map(j => {
        const raw = (j.raw ?? {}) as Record<string, unknown>;
        return {
          id: j.id,
          title: typeof raw.Description === 'string' ? raw.Description : `Job ${j.id}`,
          status: j.status,
          site_address: j.site_address,
          total_ex_tax: Number(j.total_ex_tax ?? 0),
          is_complete: Boolean(j.is_complete),
          date_created: j.date_created,
          date_completed: j.date_completed,
          distance_km: j.distance_km == null ? null : Number(j.distance_km),
        };
      });
    },
    ['jobs-all-v1', window.startDate, window.endDate, String(limit)],
    { revalidate: 300, tags: ['dashboard'] },
  )();
}
