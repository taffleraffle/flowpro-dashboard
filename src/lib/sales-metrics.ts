import { unstable_cache } from 'next/cache';
import { getServerSupabase } from './supabase';
import type { MetricsWindow } from './metrics';

// Wrap a window-keyed aggregator with a 5-min cache keyed on the window.
// Mirrors `cachedByWindow` in metrics.ts but kept local to avoid a circular
// import of the larger metrics module.
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
// Weekly trend — bucketed weekly across the selected window.
// Keep a 12wk minimum so 7D / 30D show a comparable shape; longer
// windows (QTD, YTD) get the full count.
// ============================================================
export type WeeklyBucket = {
  weekStart: string;
  label: string;
  leads: number;
  quotes: number;
  won: number;
  salesValue: number;
  revenue: number;
};

function weekKey(d: Date): string {
  const day = d.getUTCDay() || 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (day - 1));
  return monday.toISOString().slice(0, 10);
}

export const getSalesWeeklyTrend = cachedByWindow('sales-weekly-trend-v2-window', async (window): Promise<WeeklyBucket[]> => {
  const sb = getServerSupabase();
  const end = new Date(window.endDate + 'T00:00:00Z');
  const winStart = new Date(window.startDate + 'T00:00:00Z');
  // Minimum 12-week lookback so short windows still get a meaningful trend.
  const minDays = 12 * 7;
  const winDays = Math.round((+end - +winStart) / 86_400_000) + 1;
  const lookbackDays = Math.max(minDays, winDays);
  const start = new Date(end.getTime() - (lookbackDays - 1) * 86_400_000).toISOString().slice(0, 10);
  const today = window.endDate;

  const [leadsRes, jobsRes] = await Promise.all([
    sb.from('wc_leads')
      .select('date_created, quotable, lead_status, sales_value')
      .gte('date_created', start)
      .lte('date_created', today + 'T23:59:59'),
    sb.from('simpro_jobs')
      .select('date_completed, total_ex_tax, is_complete')
      .gte('date_completed', start)
      .lte('date_completed', today)
      .eq('is_complete', true),
  ]);
  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (jobsRes.error) throw new Error(jobsRes.error.message);

  const weeks = Math.ceil(lookbackDays / 7);
  const buckets = new Map<string, WeeklyBucket>();
  for (let i = weeks - 1; i >= 0; i--) {
    const anchor = new Date(end.getTime() - i * 7 * 86_400_000);
    const k = weekKey(anchor);
    buckets.set(k, {
      weekStart: k,
      label: `W${weeks - i}`,
      leads: 0, quotes: 0, won: 0, salesValue: 0, revenue: 0,
    });
  }
  for (const l of leadsRes.data ?? []) {
    if (!l.date_created) continue;
    const k = weekKey(new Date(l.date_created));
    const b = buckets.get(k);
    if (!b) continue;
    b.leads += 1;
    if (l.quotable) b.quotes += 1;
    const sales = Number(l.sales_value ?? 0);
    if ((l.lead_status ?? '').toLowerCase() === 'won' || sales > 0) {
      b.won += 1;
      b.salesValue += sales;
    }
  }
  for (const j of jobsRes.data ?? []) {
    if (!j.date_completed) continue;
    const k = weekKey(new Date(j.date_completed));
    const b = buckets.get(k);
    if (!b) continue;
    b.revenue += Number(j.total_ex_tax ?? 0);
  }
  return [...buckets.values()].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
});

// ============================================================
// Revenue/leads by weekday across the selected window
// ============================================================
export type WeekdayBucket = {
  day: string;
  dayIdx: number;
  leads: number;
  salesValue: number;
  revenue: number;
};

export const getRevenueByWeekday = cachedByWindow('sales-weekday-v2-window', async (window): Promise<WeekdayBucket[]> => {
  const sb = getServerSupabase();
  const [leadsRes, jobsRes] = await Promise.all([
    sb.from('wc_leads')
      .select('date_created, sales_value, lead_status, quotable')
      .gte('date_created', window.startDate)
      .lte('date_created', window.endDate + 'T23:59:59'),
    sb.from('simpro_jobs')
      .select('date_completed, total_ex_tax')
      .eq('is_complete', true)
      .gte('date_completed', window.startDate)
      .lte('date_completed', window.endDate),
  ]);
  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (jobsRes.error) throw new Error(jobsRes.error.message);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const out: WeekdayBucket[] = days.map((d, i) => ({
    day: d, dayIdx: i, leads: 0, salesValue: 0, revenue: 0,
  }));
  for (const l of leadsRes.data ?? []) {
    if (!l.date_created) continue;
    const d = new Date(l.date_created);
    const idx = (d.getUTCDay() + 6) % 7;
    out[idx].leads += 1;
    const s = Number(l.sales_value ?? 0);
    if ((l.lead_status ?? '').toLowerCase() === 'won' || s > 0) out[idx].salesValue += s;
  }
  for (const j of jobsRes.data ?? []) {
    if (!j.date_completed) continue;
    const d = new Date(j.date_completed);
    const idx = (d.getUTCDay() + 6) % 7;
    out[idx].revenue += Number(j.total_ex_tax ?? 0);
  }
  return out;
});

// ============================================================
// Active quotes (window-scoped instead of fixed 60d)
// ============================================================
export type QuoteRow = {
  id: number;
  customer: string;
  contact: string;
  status: 'open' | 'sent' | 'accepted' | 'declined' | 'expired';
  amount: number;
  created: string;
  source: string | null;
};

export const getActiveQuotes = cachedByWindow('sales-active-quotes-v2-window', async (window): Promise<QuoteRow[]> => {
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('wc_leads')
    .select('id, caller_name, caller_phone, caller_email, quote_value, sales_value, lead_status, date_created, lead_source')
    .eq('quotable', true)
    .gte('date_created', window.startDate)
    .lte('date_created', window.endDate + 'T23:59:59')
    .order('date_created', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => {
    const status = (r.lead_status ?? '').toLowerCase();
    const sales = Number(r.sales_value ?? 0);
    const won = status === 'won' || sales > 0;
    const declined = status === 'lost' || status === 'declined';
    return {
      id: r.id,
      customer: r.caller_name || r.caller_email || r.caller_phone || `Lead #${r.id}`,
      contact: r.caller_phone || r.caller_email || '',
      status: won ? 'accepted' : declined ? 'declined' : status === 'sent' ? 'sent' : 'open',
      amount: won ? sales : Number(r.quote_value ?? 0),
      created: r.date_created ? String(r.date_created).slice(0, 10) : '',
      source: r.lead_source,
    };
  });
});

// ============================================================
// Top customers — lifetime, NOT window-scoped (intentional)
// ============================================================
export type TopCustomerRow = {
  rank: number;
  name: string;
  jobs: number;
  lifetimeValue: number;
  since: string;
  city: string | null;
};

export const getTopCustomers = unstable_cache(
  async (limit = 8): Promise<TopCustomerRow[]> => {
    const sb = getServerSupabase();
    const { data, error } = await sb
      .from('wc_leads')
      .select('caller_name, caller_email, caller_phone, sales_value, date_created, lead_status')
      .gt('sales_value', 0)
      .order('sales_value', { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    type Bucket = { name: string; jobs: number; lifetimeValue: number; since: string };
    const buckets = new Map<string, Bucket>();
    for (const r of data ?? []) {
      const key = (r.caller_email || r.caller_phone || r.caller_name || 'unknown').toLowerCase().trim();
      const sv = Number(r.sales_value ?? 0);
      const created = r.date_created ? String(r.date_created).slice(0, 10) : '';
      const b = buckets.get(key) ?? {
        name: r.caller_name || r.caller_email || r.caller_phone || 'Unknown',
        jobs: 0,
        lifetimeValue: 0,
        since: created,
      };
      b.jobs += 1;
      b.lifetimeValue += sv;
      if (created && (!b.since || created < b.since)) b.since = created;
      buckets.set(key, b);
    }
    return [...buckets.values()]
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
      .slice(0, limit)
      .map((b, i) => ({
        rank: i + 1,
        name: b.name,
        jobs: b.jobs,
        lifetimeValue: b.lifetimeValue,
        since: b.since,
        city: null,
      }));
  },
  ['sales-top-customers-v1'],
  { revalidate: 300, tags: ['dashboard'] },
);

// ============================================================
// Sales KPIs — window-aware. Compares against previous equal-length
// period for MoM Growth so the metric matches the selector.
// ============================================================
export type SalesKpis = {
  grossRevenue: number | null;
  grossProfit: number | null;
  margin: number | null;
  avgTicket: number | null;
  quoteWinRate: number | null;
  acceptedQuotes: number;
  totalQuotes: number;
  repeatRevenue: number | null;
  repeatRevenueShare: number | null;
  momGrowth: number | null;
};

export const getSalesKpis = cachedByWindow('sales-kpis-v3-window', async (window): Promise<SalesKpis> => {
  const sb = getServerSupabase();

  // Previous equal-length window for MoM-style comparison.
  const start = new Date(window.startDate + 'T00:00:00Z');
  const end = new Date(window.endDate + 'T00:00:00Z');
  const days = Math.max(1, Math.round((+end - +start) / 86_400_000) + 1);
  const prevEnd = new Date(start.getTime() - 86_400_000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86_400_000);
  const prevStartISO = prevStart.toISOString().slice(0, 10);
  const prevEndISO = prevEnd.toISOString().slice(0, 10);

  const [quotesRes, wonRes, jobsRes, prevRes] = await Promise.all([
    sb.from('wc_leads')
      .select('id', { count: 'exact', head: true })
      .eq('quotable', true)
      .gte('date_created', window.startDate)
      .lte('date_created', window.endDate + 'T23:59:59'),
    sb.from('wc_leads')
      .select('id', { count: 'exact', head: true })
      .eq('quotable', true)
      .or('sales_value.gt.0,lead_status.eq.won')
      .gte('date_created', window.startDate)
      .lte('date_created', window.endDate + 'T23:59:59'),
    sb.from('simpro_jobs')
      .select('total_ex_tax, gross_profit, cost_ex_tax')
      .eq('is_complete', true)
      .gte('date_completed', window.startDate)
      .lte('date_completed', window.endDate),
    sb.from('simpro_jobs')
      .select('total_ex_tax')
      .eq('is_complete', true)
      .gte('date_completed', prevStartISO)
      .lte('date_completed', prevEndISO),
  ]);
  if (quotesRes.error) throw new Error(quotesRes.error.message);
  if (wonRes.error) throw new Error(wonRes.error.message);
  if (jobsRes.error) throw new Error(jobsRes.error.message);
  if (prevRes.error) throw new Error(prevRes.error.message);

  const totalQuotes = quotesRes.count ?? 0;
  const acceptedQuotes = wonRes.count ?? 0;
  const jobs = jobsRes.data ?? [];
  const grossRevenue = jobs.length > 0 ? jobs.reduce((s, j) => s + Number(j.total_ex_tax ?? 0), 0) : null;

  const jobsWithProfit = jobs.filter(j => j.gross_profit != null);
  const grossProfit = jobsWithProfit.length > 0
    ? jobsWithProfit.reduce((s, j) => s + Number(j.gross_profit ?? 0), 0)
    : null;
  const profitableRevenue = jobsWithProfit.reduce((s, j) => s + Number(j.total_ex_tax ?? 0), 0);
  const margin = grossProfit != null && profitableRevenue > 0
    ? grossProfit / profitableRevenue
    : null;

  const prevRev = (prevRes.data ?? []).reduce((s, j) => s + Number(j.total_ex_tax ?? 0), 0);
  const currRev = grossRevenue ?? 0;
  const momGrowth = prevRev > 0 ? (currRev - prevRev) / prevRev : null;

  return {
    grossRevenue,
    grossProfit,
    margin,
    avgTicket: grossRevenue != null && jobs.length > 0 ? grossRevenue / jobs.length : null,
    quoteWinRate: totalQuotes > 0 ? acceptedQuotes / totalQuotes : null,
    acceptedQuotes,
    totalQuotes,
    ...(await computeRepeatRevenue(window.startDate, window.endDate)),
    momGrowth,
  };
});

// Repeat Revenue: share of window revenue from customers with a prior job
// in the preceding 12 months.
async function computeRepeatRevenue(
  startDate: string,
  endDate: string,
): Promise<{ repeatRevenue: number | null; repeatRevenueShare: number | null }> {
  const sb = getServerSupabase();
  const yearAgo = new Date(new Date(startDate + 'T00:00:00Z').getTime() - 365 * 86_400_000).toISOString().slice(0, 10);

  const { data: recent, error: e1 } = await sb
    .from('simpro_jobs')
    .select('customer_id, total_ex_tax')
    .eq('is_complete', true)
    .gte('date_completed', startDate)
    .lte('date_completed', endDate);
  if (e1) throw new Error(e1.message);

  if (!recent || recent.length === 0) return { repeatRevenue: null, repeatRevenueShare: null };

  const PAGE = 1000;
  const historyCounts = new Map<number, number>();
  for (let from = 0; from < 30_000; from += PAGE) {
    const { data, error } = await sb
      .from('simpro_jobs')
      .select('customer_id')
      .eq('is_complete', true)
      .gte('date_completed', yearAgo)
      .lt('date_completed', startDate)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) {
      if (!r.customer_id) continue;
      historyCounts.set(r.customer_id, (historyCounts.get(r.customer_id) ?? 0) + 1);
    }
    if (rows.length < PAGE) break;
  }

  let total = 0;
  let repeat = 0;
  for (const j of recent) {
    const val = Number(j.total_ex_tax ?? 0);
    total += val;
    if (j.customer_id && (historyCounts.get(j.customer_id) ?? 0) >= 1) {
      repeat += val;
    }
  }
  return {
    repeatRevenue: total > 0 ? repeat : null,
    repeatRevenueShare: total > 0 ? repeat / total : null,
  };
}
