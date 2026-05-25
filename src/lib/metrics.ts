import { unstable_cache } from 'next/cache';
import { getServerSupabase } from './supabase';

export type MetricsWindow = { startDate: string; endDate: string };

// Wrap a window-keyed aggregator with a 5min cache + tag for invalidation
// on sync. Cache key includes function name + window. TTL is generous
// (5min) because data only changes on sync, and revalidateTag('dashboard')
// in the sync handler bypasses TTL for fresh data.
function cachedByWindow<T>(
  key: string,
  fn: (window: MetricsWindow) => Promise<T>,
): (window: MetricsWindow) => Promise<T> {
  return (window: MetricsWindow) =>
    unstable_cache(
      () => fn(window),
      [key, window.startDate, window.endDate],
      { revalidate: 300, tags: ['dashboard'] },
    )();
}

// ============================================================
// Window helpers
// ============================================================
export function prevWindow(window: MetricsWindow): MetricsWindow {
  // Parse as UTC to avoid local-timezone drift on dev machines (NZST vs UTC
  // pushes the boundary by one day and silently buckets leads into wrong dates).
  const start = new Date(window.startDate + 'T00:00:00Z');
  const end = new Date(window.endDate + 'T00:00:00Z');
  // +1 because the window is inclusive on both ends (May 1 to May 30 = 30 days).
  const days = Math.max(1, Math.round((+end - +start) / 86_400_000) + 1);
  const prevEnd = new Date(start.getTime() - 86_400_000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86_400_000);
  return {
    startDate: prevStart.toISOString().slice(0, 10),
    endDate: prevEnd.toISOString().slice(0, 10),
  };
}

function safeDelta(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return (curr - prev) / prev;
}

// ============================================================
// Headline KPIs (with previous-period delta)
// ============================================================
export type KpiValue = { value: number | null; prev: number | null; delta: number | null };

export type OverviewKpis = {
  revenue: KpiValue;     // SimPro completed-job totals
  profit: KpiValue;      // Stub — needs cost data from SimPro
  margin: KpiValue;      // profit / revenue
  jobsDone: KpiValue;    // SimPro
  avgTicket: KpiValue;   // revenue / jobs
  avgDistKm: KpiValue;   // SimPro job sites
  quoteRate: KpiValue;   // won leads / leads (from WC)
  leads: KpiValue;       // WC total
};

async function aggregateWindow(window: MetricsWindow) {
  const sb = getServerSupabase();
  const [leadsRes, wonRes, jobsRes, distRes] = await Promise.all([
    sb.from('wc_leads').select('id', { count: 'exact', head: true })
      .gte('date_created', window.startDate)
      .lte('date_created', window.endDate),
    sb.from('wc_leads').select('id', { count: 'exact', head: true })
      .gte('date_created', window.startDate)
      .lte('date_created', window.endDate)
      .or('sales_value.gt.0,lead_status.eq.won'),
    // Use `date_completed` so KPIs match the Revenue trend + Revenue by Service
    // cards (which also filter by completion date). Otherwise jobs created
    // mid-window but completed earlier double-count and disagree across cards.
    sb.from('simpro_jobs').select('id, total_ex_tax, is_complete, distance_km')
      .gte('date_completed', window.startDate)
      .lte('date_completed', window.endDate)
      .eq('is_complete', true),
    null,
  ]);
  if (leadsRes.error) throw new Error(`wc_leads count: ${leadsRes.error.message}`);
  if (wonRes.error) throw new Error(`wc_leads won: ${wonRes.error.message}`);
  if (jobsRes.error) throw new Error(`simpro_jobs: ${jobsRes.error.message}`);

  // `jobs` is now pre-filtered to is_complete via the query above.
  // We return null (not 0) when there are zero rows, so the dashboard can
  // distinguish "no SimPro data" from "SimPro returned 0 completes" — both
  // collapse to null here, with the sync-error banner clarifying which.
  const jobs = jobsRes.data ?? [];
  const revenue = jobs.reduce((a, j) => a + Number(j.total_ex_tax ?? 0), 0);
  const distSamples = jobs
    .map(j => (j.distance_km == null ? null : Number(j.distance_km)))
    .filter((n): n is number => n != null && Number.isFinite(n));
  const avgDist = distSamples.length ? distSamples.reduce((a, b) => a + b, 0) / distSamples.length : null;

  return {
    leads: leadsRes.count ?? 0,
    won: wonRes.count ?? 0,
    jobs: jobs.length > 0 ? jobs.length : null,
    revenue: jobs.length > 0 ? revenue : null,
    avgDist,
  };
}

export const getOverviewKpis = cachedByWindow('overview-kpis', _getOverviewKpis);
async function _getOverviewKpis(window: MetricsWindow): Promise<OverviewKpis> {
  const prev = prevWindow(window);
  const [cur, pre] = await Promise.all([aggregateWindow(window), aggregateWindow(prev)]);

  const kpi = (curr: number | null, prevV: number | null): KpiValue => ({
    value: curr,
    prev: prevV,
    delta: safeDelta(curr, prevV),
  });

  const avgTicket = (rev: number | null, jobs: number | null) =>
    rev != null && jobs != null && jobs > 0 ? rev / jobs : null;

  const quoteRate = (won: number, leads: number) => (leads > 0 ? won / leads : null);

  return {
    revenue: kpi(cur.revenue, pre.revenue),
    profit: kpi(null, null), // stubbed — needs job cost data
    margin: kpi(null, null),
    jobsDone: kpi(cur.jobs, pre.jobs),
    avgTicket: kpi(avgTicket(cur.revenue, cur.jobs), avgTicket(pre.revenue, pre.jobs)),
    avgDistKm: kpi(cur.avgDist, pre.avgDist),
    quoteRate: kpi(quoteRate(cur.won, cur.leads), quoteRate(pre.won, pre.leads)),
    leads: kpi(cur.leads, pre.leads),
  };
}

// ============================================================
// Daily series for Revenue & Profit chart + KPI sparklines
// ============================================================
export type DailySeries = {
  dates: string[];   // YYYY-MM-DD per day in window
  revenue: number[];
  jobs: number[];
  leads: number[];
};

export const getDailySeries = cachedByWindow('daily-series', _getDailySeries);
async function _getDailySeries(window: MetricsWindow): Promise<DailySeries> {
  const sb = getServerSupabase();
  const [jobsRes, leadsRes] = await Promise.all([
    sb.from('simpro_jobs').select('date_completed, total_ex_tax, is_complete')
      .gte('date_completed', window.startDate)
      .lte('date_completed', window.endDate),
    sb.from('wc_leads').select('date_created')
      .gte('date_created', window.startDate)
      .lte('date_created', window.endDate),
  ]);
  if (jobsRes.error) throw new Error(jobsRes.error.message);
  if (leadsRes.error) throw new Error(leadsRes.error.message);

  // Build day bucket list — parsed as UTC so bucket keys match Supabase's
  // string-comparison against YYYY-MM-DD on `timestamptz` columns.
  const start = new Date(window.startDate + 'T00:00:00Z');
  const end = new Date(window.endDate + 'T00:00:00Z');
  const dates: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  const revenue: Record<string, number> = {};
  const jobs: Record<string, number> = {};
  const leads: Record<string, number> = {};
  for (const d of dates) { revenue[d] = 0; jobs[d] = 0; leads[d] = 0; }

  for (const j of jobsRes.data ?? []) {
    if (!j.is_complete || !j.date_completed) continue;
    const k = String(j.date_completed).slice(0, 10);
    if (k in revenue) {
      revenue[k] += Number(j.total_ex_tax ?? 0);
      jobs[k] += 1;
    }
  }
  for (const l of leadsRes.data ?? []) {
    if (!l.date_created) continue;
    const k = String(l.date_created).slice(0, 10);
    if (k in leads) leads[k] += 1;
  }

  return {
    dates,
    revenue: dates.map(d => revenue[d]),
    jobs: dates.map(d => jobs[d]),
    leads: dates.map(d => leads[d]),
  };
}

// ============================================================
// Lead source attribution (the big one)
// ============================================================
// Categorize raw WC lead_source / lead_medium / paid-click IDs into
// the buckets the user actually thinks in: Google Ads vs Google Organic,
// GBP, Bing, Facebook/Meta, Direct, Referral, AI/Other.

export type LeadSourceCategory =
  | 'Google Ads' | 'Google Organic' | 'Google Business Profile'
  | 'Bing Ads' | 'Bing Organic'
  | 'Meta Ads' | 'Facebook'
  | 'Referral' | 'Direct' | 'AI Search' | 'Other';

const SOURCE_COLORS: Record<LeadSourceCategory, string> = {
  'Google Ads':              '#1BA8D4',
  'Google Organic':          '#0D3556',
  'Google Business Profile': '#7DD3E8',
  'Bing Ads':                '#2BBDE6',
  'Bing Organic':            '#134268',
  'Meta Ads':                '#0F8CB8',
  'Facebook':                '#1E5380',
  'Referral':                '#15A36A',
  'Direct':                  '#93A1AE',
  'AI Search':               '#E8A93C',
  'Other':                   '#6B7A88',
};

const AI_HOSTS = ['chatgpt', 'copilot', 'perplexity', 'gemini', 'claude'];

function categorize(row: {
  lead_source: string | null;
  lead_medium: string | null;
  gclid: string | null;
  msclkid: string | null;
  fbclid: string | null;
}): LeadSourceCategory {
  const src = (row.lead_source ?? '').toLowerCase().trim();
  const med = (row.lead_medium ?? '').toLowerCase().trim();
  if (row.gclid) return 'Google Ads';
  if (row.msclkid) return 'Bing Ads';
  if (row.fbclid) return 'Meta Ads';
  if (med === 'cpc' || med === 'paid' || med === 'ppc') {
    if (src.includes('google')) return 'Google Ads';
    if (src.includes('bing')) return 'Bing Ads';
    if (src.includes('facebook') || src.includes('meta') || src.includes('instagram')) return 'Meta Ads';
  }
  if (src === 'gmb' || src === 'google-business' || src.includes('business.google')) return 'Google Business Profile';
  if (src.includes('google')) return 'Google Organic';
  if (src.includes('bing')) return 'Bing Organic';
  if (src.includes('facebook') || src.includes('instagram')) return 'Facebook';
  if (med === 'referral') return 'Referral';
  if (src === '(direct)' || src === 'direct' || src === '' || med === '(none)') return 'Direct';
  if (AI_HOSTS.some(h => src.includes(h))) return 'AI Search';
  return 'Other';
}

export type AcquisitionRow = {
  source: LeadSourceCategory;
  color: string;
  leads: number;
  won: number;
  revenue: number;
  // `isPaid` separates "no spend because the channel is free" (organic, direct,
  // referral) from "no spend because the ads sync hasn't run yet" (paid channels
  // before Google Ads / Meta Ads creds arrive). Without this split, the UI
  // shows a misleading green ∞ ROAS badge on paid sources just because spend
  // is null.
  isPaid: boolean;
  spend: number | null;
  conv: number;
  roas: number | null;
  cpa: number | null;
};

export const getAcquisition = cachedByWindow('acquisition-v2-bridge', _getAcquisition);
async function _getAcquisition(window: MetricsWindow): Promise<AcquisitionRow[]> {
  const sb = getServerSupabase();
  // 1) Leads in window (drives the channel attribution)
  const { data: leads, error } = await sb
    .from('wc_leads')
    .select('id, lead_source, lead_medium, gclid, msclkid, fbclid, sales_value, lead_status, quotable')
    .gte('date_created', window.startDate)
    .lte('date_created', window.endDate);
  if (error) throw new Error(`acquisition query: ${error.message}`);

  // 2) For revenue per channel, use the WC↔SimPro bridge instead of WC's
  //    `sales_value` (which is almost always empty). For each lead that has
  //    been matched to a SimPro customer, we sum the revenue of jobs that
  //    customer completed WITHIN the same window. This makes "Google Ads
  //    revenue this month" mean: real money invoiced from customers that
  //    Google Ads delivered as leads this month.
  const leadIds = (leads ?? []).map(l => l.id as number);
  const matchByLead = new Map<number, { customer_id: number | null }>();
  if (leadIds.length > 0) {
    const { data: matchRows } = await sb
      .from('wc_simpro_matches')
      .select('lead_id, customer_id')
      .in('lead_id', leadIds);
    for (const m of matchRows ?? []) {
      if (m.lead_id != null) matchByLead.set(Number(m.lead_id), { customer_id: m.customer_id });
    }
  }
  // Sum job revenue per customer in window (one query, indexed)
  const customerIds = [...new Set([...matchByLead.values()].map(v => v.customer_id).filter((x): x is number => x != null))];
  const revByCustomer = new Map<number, number>();
  if (customerIds.length > 0) {
    // Page in chunks of 1000 to dodge URL-length limits on .in()
    for (let i = 0; i < customerIds.length; i += 500) {
      const slice = customerIds.slice(i, i + 500);
      const { data: jobRows } = await sb
        .from('simpro_jobs')
        .select('customer_id, total_ex_tax')
        .in('customer_id', slice)
        .eq('is_complete', true)
        .gte('date_completed', window.startDate)
        .lte('date_completed', window.endDate);
      for (const j of jobRows ?? []) {
        if (j.customer_id == null) continue;
        const c = Number(j.customer_id);
        revByCustomer.set(c, (revByCustomer.get(c) ?? 0) + Number(j.total_ex_tax ?? 0));
      }
    }
  }

  type Bucket = { leads: number; won: number; revenue: number };
  const buckets = new Map<LeadSourceCategory, Bucket>();
  for (const row of leads ?? []) {
    const cat = categorize(row as Parameters<typeof categorize>[0]);
    const b = buckets.get(cat) ?? { leads: 0, won: 0, revenue: 0 };
    b.leads += 1;
    const match = matchByLead.get(Number(row.id));
    const bridgedRev = match?.customer_id != null ? revByCustomer.get(match.customer_id) ?? 0 : 0;
    // "Won" now means: lead converted to a real completed job in window.
    // Fall back to WC sales_value > 0 for leads that haven't been matched yet.
    const sales = Number(row.sales_value ?? 0);
    const wonByBridge = bridgedRev > 0;
    const wonByWc = (row.lead_status ?? '').toLowerCase() === 'won' || sales > 0;
    if (wonByBridge || wonByWc) {
      b.won += 1;
      b.revenue += bridgedRev > 0 ? bridgedRev : sales;
    }
    buckets.set(cat, b);
  }

  // Ads spend by category (pull from ads_spend_daily — empty until ads sync runs)
  const { data: spendRows } = await sb
    .from('ads_spend_daily')
    .select('source, spend')
    .gte('date', window.startDate)
    .lte('date', window.endDate);
  const spendBySource: Partial<Record<LeadSourceCategory, number>> = {};
  for (const r of spendRows ?? []) {
    const cat: LeadSourceCategory | null =
      r.source === 'google_ads' ? 'Google Ads' :
      r.source === 'meta_ads' ? 'Meta Ads' :
      r.source === 'microsoft_ads' ? 'Bing Ads' :
      null;
    if (!cat) continue;
    spendBySource[cat] = (spendBySource[cat] ?? 0) + Number(r.spend ?? 0);
  }

  const PAID: LeadSourceCategory[] = ['Google Ads', 'Bing Ads', 'Meta Ads'];

  const rows: AcquisitionRow[] = [...buckets.entries()].map(([source, b]) => {
    const isPaid = PAID.includes(source);
    const spend = isPaid ? spendBySource[source] ?? null : null;
    return {
      source,
      color: SOURCE_COLORS[source],
      leads: b.leads,
      won: b.won,
      revenue: b.revenue,
      isPaid,
      spend,
      conv: b.leads > 0 ? b.won / b.leads : 0,
      roas: spend && spend > 0 ? b.revenue / spend : null,
      cpa: spend && spend > 0 && b.won > 0 ? spend / b.won : null,
    };
  });

  // Sort by revenue desc, with paid sources floated to top on tie
  rows.sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);
  return rows;
}

// ============================================================
// Acquisition funnel: Impressions → Leads → Quoted → Won
// ============================================================
export type FunnelData = {
  impressions: number | null; // ads platforms
  leads: number;
  quotesSent: number;         // WC quotable=true
  quotesWon: number;          // WC lead_status=won OR sales_value>0
  costPerLead: number | null;
  costPerAcq: number | null;
};

export const getFunnel = cachedByWindow('funnel', _getFunnel);
async function _getFunnel(window: MetricsWindow): Promise<FunnelData> {
  const sb = getServerSupabase();
  const [leadsRes, quotedRes, wonRes, impressionsRes, spendRes] = await Promise.all([
    sb.from('wc_leads').select('id', { count: 'exact', head: true })
      .gte('date_created', window.startDate).lte('date_created', window.endDate),
    sb.from('wc_leads').select('id', { count: 'exact', head: true })
      .gte('date_created', window.startDate).lte('date_created', window.endDate)
      .eq('quotable', true),
    sb.from('wc_leads').select('id', { count: 'exact', head: true })
      .gte('date_created', window.startDate).lte('date_created', window.endDate)
      .or('sales_value.gt.0,lead_status.eq.won'),
    sb.from('ads_spend_daily').select('impressions')
      .gte('date', window.startDate).lte('date', window.endDate),
    sb.from('ads_spend_daily').select('spend')
      .gte('date', window.startDate).lte('date', window.endDate),
  ]);

  const leads = leadsRes.count ?? 0;
  const quotesSent = quotedRes.count ?? 0;
  const quotesWon = wonRes.count ?? 0;
  const imps = impressionsRes.data ?? [];
  const impressions = imps.length ? imps.reduce((a, r) => a + Number(r.impressions ?? 0), 0) : null;
  const spend = (spendRes.data ?? []).reduce((a, r) => a + Number(r.spend ?? 0), 0);

  return {
    impressions,
    leads,
    quotesSent,
    quotesWon,
    costPerLead: spend > 0 && leads > 0 ? spend / leads : null,
    costPerAcq: spend > 0 && quotesWon > 0 ? spend / quotesWon : null,
  };
}

// ============================================================
// Revenue by service category (SimPro job category breakdown)
// ============================================================
export type ServiceCategoryRow = {
  category: string;
  color: string;
  jobs: number;
  revenue: number;
  avgTicket: number;
};

const SERVICE_PALETTE = ['#1BA8D4', '#0D3556', '#7DD3E8', '#134268', '#2BBDE6', '#E8A93C', '#15A36A', '#93A1AE'];

export async function getServiceCategories(window: MetricsWindow): Promise<ServiceCategoryRow[]> {
  const sb = getServerSupabase();
  // We don't have a category column yet on simpro_jobs — fall back to `status`
  // as the rough split until we extend the schema with `job_category`.
  const { data, error } = await sb
    .from('simpro_jobs')
    .select('status, total_ex_tax, is_complete')
    .gte('date_completed', window.startDate)
    .lte('date_completed', window.endDate)
    .eq('is_complete', true);
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const grouped = new Map<string, { jobs: number; revenue: number }>();
  for (const r of rows) {
    const key = r.status || 'Unknown';
    const g = grouped.get(key) ?? { jobs: 0, revenue: 0 };
    g.jobs += 1;
    g.revenue += Number(r.total_ex_tax ?? 0);
    grouped.set(key, g);
  }
  return [...grouped.entries()]
    .map(([category, g], i) => ({
      category,
      color: SERVICE_PALETTE[i % SERVICE_PALETTE.length],
      jobs: g.jobs,
      revenue: g.revenue,
      avgTicket: g.jobs > 0 ? g.revenue / g.jobs : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ============================================================
// Sync run health (used in footer + small indicator)
// ============================================================
export type SyncRunRow = {
  id: number;
  source: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'ok' | 'error';
  rows_upserted: number | null;
  error_message: string | null;
};

export const getRecentSyncRuns = unstable_cache(
  async (limit = 8) => {
    return _getRecentSyncRuns(limit);
  },
  ['recent-sync-runs'],
  { revalidate: 30, tags: ['dashboard', 'sync_runs'] },
);

// Sources whose MOST RECENT run is in error state. Old failed runs from before
// a fix shouldn't blare in the banner — only persistent / current failures do.
export async function getActiveErrors(): Promise<SyncRunRow[]> {
  const runs = await getRecentSyncRuns(50);
  const latestPerSource = new Map<string, SyncRunRow>();
  for (const r of runs) {
    if (!latestPerSource.has(r.source)) latestPerSource.set(r.source, r);
  }
  return [...latestPerSource.values()].filter(r => r.status === 'error');
}

async function _getRecentSyncRuns(limit = 8): Promise<SyncRunRow[]> {
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('sync_runs')
    .select('id, source, started_at, finished_at, status, rows_upserted, error_message')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`sync_runs query failed: ${error.message}`);
  return (data ?? []) as SyncRunRow[];
}

// ============================================================
// Geography (kept for Jobs tab — not Overview anymore)
// ============================================================
export type GeographyStats = {
  total: number;
  geocoded: number;
  avgDistanceKm: number | null;
  withinKm: { km: number; count: number; pct: number }[];
};

export async function getGeographyStats(window: MetricsWindow): Promise<GeographyStats> {
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('simpro_jobs')
    .select('id, distance_km')
    .gte('date_created', window.startDate)
    .lte('date_created', window.endDate);
  if (error) throw new Error(`geography query: ${error.message}`);
  const rows = data ?? [];
  const geocoded = rows.filter(r => r.distance_km != null);
  const avgDistanceKm = geocoded.length
    ? geocoded.reduce((a, r) => a + Number(r.distance_km ?? 0), 0) / geocoded.length
    : null;
  const buckets = [5, 10, 20, 50];
  const withinKm = buckets.map(km => {
    const count = geocoded.filter(r => Number(r.distance_km) <= km).length;
    return { km, count, pct: geocoded.length ? count / geocoded.length : 0 };
  });
  return { total: rows.length, geocoded: geocoded.length, avgDistanceKm, withinKm };
}

// ============================================================
// Re-exports (back-compat with older imports)
// ============================================================
export { fmt } from './format';
export const fmtMoney = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(n);
export const fmtPct = (n: number | null | undefined, d = 1) =>
  n == null ? '—' : `${(n * 100).toFixed(d)}%`;
export const fmtNumber = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-NZ').format(n);

// ============================================================
// Job Attribution — actual jobs traceable to a WhatConverts lead,
// joined to the channel via the wc_simpro_matches bridge.
// ============================================================
export type JobAttributionRow = {
  jobId: number;
  customerId: number | null;
  customerName: string;
  jobDate: string | null;          // completed date
  jobRevenue: number;
  channel: LeadSourceCategory;
  channelColor: string;
  leadDate: string | null;
  leadSource: string | null;
  leadMedium: string | null;
  matchMethod: 'phone' | 'email' | 'phone+email' | null;
};

export type AttributionSummary = {
  rows: JobAttributionRow[];
  totalRevenueInWindow: number;       // all completed jobs in window
  attributedRevenue: number;          // revenue from rows above
  untrackedRevenue: number;           // total - attributed (jobs we couldn't trace)
  attributedShare: number;            // 0..1
  matchedLeads: number;               // bridge has customer_id
  totalLeads: number;
};

export const getJobAttribution = cachedByWindow('job-attribution-v1', _getJobAttribution);
async function _getJobAttribution(window: MetricsWindow): Promise<JobAttributionRow[]> {
  const sb = getServerSupabase();

  // 1) All matched leads (cheap — only ~239 rows)
  const { data: matches, error: e1 } = await sb
    .from('wc_simpro_matches')
    .select('lead_id, customer_id, first_job_id')
    .not('customer_id', 'is', null);
  if (e1) throw new Error(`matches: ${e1.message}`);
  const matchRows = matches ?? [];
  if (matchRows.length === 0) return [];

  const customerIds = [...new Set(matchRows.map(m => Number(m.customer_id)).filter(Boolean))];
  const leadIds = matchRows.map(m => Number(m.lead_id)).filter(Boolean);

  // 2) Jobs completed in window for matched customers
  const { data: jobs, error: e2 } = await sb
    .from('simpro_jobs')
    .select('id, customer_id, total_ex_tax, date_completed')
    .in('customer_id', customerIds)
    .eq('is_complete', true)
    .gte('date_completed', window.startDate)
    .lte('date_completed', window.endDate);
  if (e2) throw new Error(`attribution jobs: ${e2.message}`);

  // 3) Lead source per matched lead
  const { data: leads, error: e3 } = await sb
    .from('wc_leads')
    .select('id, lead_source, lead_medium, gclid, msclkid, fbclid, date_created')
    .in('id', leadIds);
  if (e3) throw new Error(`attribution leads: ${e3.message}`);

  // 4) Customer names
  const { data: customers, error: e4 } = await sb
    .from('simpro_customers')
    .select('id, company_name, given_name, family_name')
    .in('id', customerIds);
  if (e4) throw new Error(`attribution customers: ${e4.message}`);

  // Build lookups
  const leadByCustomer = new Map<number, typeof matchRows[number]>();
  for (const m of matchRows) {
    if (m.customer_id != null) leadByCustomer.set(Number(m.customer_id), m);
  }
  const leadInfo = new Map<number, (typeof leads)[number]>();
  for (const l of leads ?? []) leadInfo.set(Number(l.id), l);
  const customerInfo = new Map<number, { name: string }>();
  for (const c of customers ?? []) {
    const name = c.company_name?.trim() || [c.given_name, c.family_name].filter(Boolean).join(' ').trim() || `Customer ${c.id}`;
    customerInfo.set(Number(c.id), { name });
  }

  const rows: JobAttributionRow[] = [];
  for (const j of jobs ?? []) {
    if (j.customer_id == null) continue;
    const match = leadByCustomer.get(Number(j.customer_id));
    if (!match) continue;
    const lead = leadInfo.get(Number(match.lead_id));
    if (!lead) continue;
    const channel = categorize({
      lead_source: lead.lead_source ?? null,
      lead_medium: lead.lead_medium ?? null,
      gclid: lead.gclid ?? null,
      msclkid: lead.msclkid ?? null,
      fbclid: lead.fbclid ?? null,
    });
    rows.push({
      jobId: Number(j.id),
      customerId: Number(j.customer_id),
      customerName: customerInfo.get(Number(j.customer_id))?.name ?? `Customer ${j.customer_id}`,
      jobDate: j.date_completed ?? null,
      jobRevenue: Number(j.total_ex_tax ?? 0),
      channel,
      channelColor: SOURCE_COLORS[channel],
      leadDate: lead.date_created ?? null,
      leadSource: lead.lead_source ?? null,
      leadMedium: lead.lead_medium ?? null,
      matchMethod: null,
    });
  }
  // Newest jobs first
  rows.sort((a, b) => (b.jobDate ?? '').localeCompare(a.jobDate ?? ''));
  return rows;
}

// Wrapper that bundles attribution rows with the window's tracking-coverage
// stats. Lets the UI render a transparent "tracked vs untracked" pill.
export const getAttributionSummary = cachedByWindow('attribution-summary-v1', _getAttributionSummary);
async function _getAttributionSummary(window: MetricsWindow): Promise<AttributionSummary> {
  const sb = getServerSupabase();
  const rows = await getJobAttribution(window);

  // Total job revenue in window (everything, attributed or not)
  const { data: allJobs } = await sb
    .from('simpro_jobs')
    .select('total_ex_tax')
    .eq('is_complete', true)
    .gte('date_completed', window.startDate)
    .lte('date_completed', window.endDate);
  const totalRevenueInWindow = (allJobs ?? []).reduce(
    (s, j) => s + Number(j.total_ex_tax ?? 0),
    0,
  );
  const attributedRevenue = rows.reduce((s, r) => s + r.jobRevenue, 0);
  const untrackedRevenue = Math.max(0, totalRevenueInWindow - attributedRevenue);

  // Lead-side: how many of the leads created in this window are matched?
  const [{ count: totalLeads }, { count: matchedLeads }] = await Promise.all([
    sb.from('wc_leads')
      .select('id', { count: 'exact', head: true })
      .gte('date_created', window.startDate)
      .lte('date_created', window.endDate),
    sb.from('wc_leads')
      .select('id, wc_simpro_matches!inner(customer_id)', { count: 'exact', head: true })
      .gte('date_created', window.startDate)
      .lte('date_created', window.endDate)
      .not('wc_simpro_matches.customer_id', 'is', null),
  ]);

  return {
    rows,
    totalRevenueInWindow,
    attributedRevenue,
    untrackedRevenue,
    attributedShare: totalRevenueInWindow > 0 ? attributedRevenue / totalRevenueInWindow : 0,
    matchedLeads: matchedLeads ?? 0,
    totalLeads: totalLeads ?? 0,
  };
}

// Legacy back-compat for jobs/customers pages
export type LeadSourceRow = { source: string; leads: number; quoted_value: number; sales_value: number };
export async function getLeadSources(window: MetricsWindow): Promise<LeadSourceRow[]> {
  const acq = await getAcquisition(window);
  return acq.map(a => ({ source: a.source, leads: a.leads, quoted_value: a.revenue, sales_value: a.revenue }));
}
export type OverviewMetrics = {
  adSpend: number | null; leads: number; costPerLead: number | null;
  quoted: number; closeRate: number | null; revenue: number; roas: number | null; jobs: number;
};
export async function getOverviewMetrics(window: MetricsWindow): Promise<OverviewMetrics> {
  const k = await getOverviewKpis(window);
  return {
    adSpend: null,
    leads: k.leads.value ?? 0,
    costPerLead: null,
    quoted: 0,
    closeRate: k.quoteRate.value,
    revenue: k.revenue.value ?? 0,
    roas: null,
    jobs: k.jobsDone.value ?? 0,
  };
}
