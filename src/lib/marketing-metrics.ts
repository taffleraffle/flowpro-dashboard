import { unstable_cache } from 'next/cache';
import { getServerSupabase } from './supabase';
import { getAcquisition, type AcquisitionRow } from './metrics';
import type { MetricsWindow } from './metrics';

// ============================================================
// Thresholds — targets the marketing team holds itself to.
// Cells go green / amber / red on tracker tables vs these.
// ============================================================
export const TH = {
  cpl: 65,
  cpq: 85,
  cpj: 175,
  leadToQuote: 0.75,
  closeRate: 0.50,
  roas: 4.0,
};

export type ThresholdDirection = 'below' | 'above';

export function thresholdClass(
  value: number | null | undefined,
  target: number,
  direction: ThresholdDirection = 'below',
  tolerance = 0.05,
): '' | 'cell-good' | 'cell-warn' | 'cell-bad' {
  if (value == null || Number.isNaN(value)) return '';
  const ok = direction === 'below' ? value <= target : value >= target;
  const near = direction === 'below'
    ? value <= target * (1 + tolerance)
    : value >= target * (1 - tolerance);
  if (ok) return 'cell-good';
  if (near) return 'cell-warn';
  return 'cell-bad';
}

// ============================================================
// MarketingRow + DailyTrackerRow share the same shape — both are
// just a window of underlying counters with ratios computed.
// ============================================================
export type MarketingRow = {
  adspend: number;
  leads: number;
  cpl: number;
  qualifiedQuotes: number;
  leadToQuote: number;
  cpq: number;
  quotableValue: number;
  avgQuoteValue: number;
  jobsClosed: number;
  closeRate: number;
  cpj: number;
  contractedRevenue: number;
  roas: number;
  revPerLead: number;
  revPerQuote: number;
};
export type DailyTrackerRow = MarketingRow & { date: string };
export type MarketingRolling = {
  d4: MarketingRow;
  d7: MarketingRow;
  d30: MarketingRow;
  mtd: MarketingRow;
  // The user-selected window. KPI strip renders this; the rolling
  // comparison table renders the d4/d7/d30/mtd columns.
  window: MarketingRow;
};

type DailyBuckets = Record<string, {
  date: string;
  adspend: number;
  leads: number;
  qualifiedQuotes: number;
  quotableValue: number;
  jobsClosed: number;
  contractedRevenue: number;
}>;

// ============================================================
// THE SINGLE QUERY THAT REPLACES 22 ROUND-TRIPS.
// Pulls ALL underlying rows (leads / jobs / spend) for the last
// `days` days in three parallel reads, then aggregates entirely
// in-memory. Daily tracker + rolling windows both derive from
// the same bucket data — no double-counting, no extra queries.
// ============================================================
async function loadDailyBuckets(days = 90): Promise<DailyBuckets> {
  const sb = getServerSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);

  const [leadsRes, jobsRes, spendRes] = await Promise.all([
    sb.from('wc_leads')
      .select('date_created, quotable, quote_value')
      .gte('date_created', start)
      .lte('date_created', today + 'T23:59:59'),
    sb.from('simpro_jobs')
      .select('date_completed, total_ex_tax, is_complete')
      .gte('date_completed', start)
      .lte('date_completed', today)
      .eq('is_complete', true),
    sb.from('ads_spend_daily')
      .select('date, spend')
      .gte('date', start)
      .lte('date', today),
  ]);
  if (leadsRes.error) throw new Error(`leads: ${leadsRes.error.message}`);
  if (jobsRes.error) throw new Error(`jobs: ${jobsRes.error.message}`);
  if (spendRes.error) throw new Error(`spend: ${spendRes.error.message}`);

  const buckets: DailyBuckets = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    buckets[d] = { date: d, adspend: 0, leads: 0, qualifiedQuotes: 0, quotableValue: 0, jobsClosed: 0, contractedRevenue: 0 };
  }
  for (const l of leadsRes.data ?? []) {
    const k = String(l.date_created).slice(0, 10);
    const b = buckets[k];
    if (!b) continue;
    b.leads += 1;
    if (l.quotable) {
      b.qualifiedQuotes += 1;
      b.quotableValue += Number(l.quote_value ?? 0);
    }
  }
  for (const j of jobsRes.data ?? []) {
    if (!j.date_completed) continue;
    const k = String(j.date_completed).slice(0, 10);
    const b = buckets[k];
    if (!b) continue;
    b.jobsClosed += 1;
    b.contractedRevenue += Number(j.total_ex_tax ?? 0);
  }
  for (const s of spendRes.data ?? []) {
    const k = String(s.date).slice(0, 10);
    const b = buckets[k];
    if (!b) continue;
    b.adspend += Number(s.spend ?? 0);
  }
  return buckets;
}

function aggregate(buckets: DailyBuckets, startDate: string, endDate: string): MarketingRow {
  const totals = { adspend: 0, leads: 0, qualifiedQuotes: 0, quotableValue: 0, jobsClosed: 0, contractedRevenue: 0 };
  for (const d of Object.keys(buckets)) {
    if (d < startDate || d > endDate) continue;
    const b = buckets[d];
    totals.adspend += b.adspend;
    totals.leads += b.leads;
    totals.qualifiedQuotes += b.qualifiedQuotes;
    totals.quotableValue += b.quotableValue;
    totals.jobsClosed += b.jobsClosed;
    totals.contractedRevenue += b.contractedRevenue;
  }
  const div = (a: number, b: number) => (b > 0 ? a / b : 0);
  return {
    adspend: totals.adspend,
    leads: totals.leads,
    cpl: div(totals.adspend, totals.leads),
    qualifiedQuotes: totals.qualifiedQuotes,
    leadToQuote: div(totals.qualifiedQuotes, totals.leads),
    cpq: div(totals.adspend, totals.qualifiedQuotes),
    quotableValue: totals.quotableValue,
    avgQuoteValue: div(totals.quotableValue, totals.qualifiedQuotes),
    jobsClosed: totals.jobsClosed,
    closeRate: div(totals.jobsClosed, totals.qualifiedQuotes),
    cpj: div(totals.adspend, totals.jobsClosed),
    contractedRevenue: totals.contractedRevenue,
    roas: div(totals.contractedRevenue, totals.adspend),
    revPerLead: div(totals.contractedRevenue, totals.leads),
    revPerQuote: div(totals.contractedRevenue, totals.qualifiedQuotes),
  };
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
}

// ============================================================
// Public API — same shape as before, dramatically faster.
// ============================================================
export type MarketingBundle = { rolling: MarketingRolling; daily: DailyTrackerRow[] };

// 60-second cache: data refreshes via the 30-min autoSync cron, so showing
// a value up to a minute old is fine — and clicks within a session feel
// instant (cache hit) instead of paying the full Supabase round-trip.
// The /api/sync/{source} endpoint calls revalidateTag('marketing') after
// each successful sync so manual triggers update immediately.
// Window-aware version. Internally pulls 90 days for the rolling-comparison
// table and the selected window's bounds (may exceed 90d for YTD/QTD).
export const getMarketingBundle = (window?: MetricsWindow) =>
  _getMarketingBundleCached(window?.startDate ?? '', window?.endDate ?? '');

const _getMarketingBundleCached = (startDate: string, endDate: string) =>
  unstable_cache(
    () => _getMarketingBundleUncached(startDate, endDate),
    ['marketing-bundle-v2', startDate, endDate],
    { revalidate: 300, tags: ['marketing'] },
  )();

async function _getMarketingBundleUncached(
  windowStart: string,
  windowEnd: string,
): Promise<MarketingBundle> {
  const today = new Date().toISOString().slice(0, 10);
  // Pull whichever is longer: 90d rolling buckets or the user's selected
  // window. YTD will be 130-140 days, well beyond 90.
  const days = windowStart
    ? Math.max(
        90,
        Math.round(
          (new Date(today + 'T00:00:00Z').getTime() -
            new Date(windowStart + 'T00:00:00Z').getTime()) /
            86_400_000,
        ) + 1,
      )
    : 90;
  const buckets = await loadDailyBuckets(days);

  // Rolling windows
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const mtdStart = monthStart.toISOString().slice(0, 10);
  const rolling: MarketingRolling = {
    d4: aggregate(buckets, daysAgo(3), today),
    d7: aggregate(buckets, daysAgo(6), today),
    d30: aggregate(buckets, daysAgo(29), today),
    mtd: aggregate(buckets, mtdStart, today),
    // Selected window — falls back to 30d when caller didn't pass one
    window: aggregate(
      buckets,
      windowStart || daysAgo(29),
      windowEnd || today,
    ),
  };

  // Daily tracker — last 30 days, newest first
  const daily: DailyTrackerRow[] = [];
  for (let i = 0; i < 30; i++) {
    const d = daysAgo(i);
    const b = buckets[d];
    if (!b) continue;
    const div = (a: number, x: number) => (x > 0 ? a / x : 0);
    daily.push({
      date: d,
      adspend: b.adspend,
      leads: b.leads,
      cpl: div(b.adspend, b.leads),
      qualifiedQuotes: b.qualifiedQuotes,
      leadToQuote: div(b.qualifiedQuotes, b.leads),
      cpq: div(b.adspend, b.qualifiedQuotes),
      quotableValue: b.quotableValue,
      avgQuoteValue: div(b.quotableValue, b.qualifiedQuotes),
      jobsClosed: b.jobsClosed,
      closeRate: div(b.jobsClosed, b.qualifiedQuotes),
      cpj: div(b.adspend, b.jobsClosed),
      contractedRevenue: b.contractedRevenue,
      roas: div(b.contractedRevenue, b.adspend),
      revPerLead: div(b.contractedRevenue, b.leads),
      revPerQuote: div(b.contractedRevenue, b.qualifiedQuotes),
    });
  }
  return { rolling, daily };
}

// Back-compat wrappers (old callers can still use these individually)
export async function getMarketingRolling(): Promise<MarketingRolling> {
  return (await getMarketingBundle()).rolling;
}
export async function getDailyTracker(days = 30): Promise<DailyTrackerRow[]> {
  const bundle = await getMarketingBundle();
  return bundle.daily.slice(0, days);
}

// ============================================================
// Channel-grouped acquisition (paid / organic / word-of-mouth)
// ============================================================
export type ChannelKey = 'paid' | 'organic' | 'word';
export type ChannelGroup = {
  key: ChannelKey;
  label: string;
  tint: string;
  icon: 'cash' | 'trend' | 'target';
  sources: AcquisitionRow[];
  totals: { leads: number; spend: number; revenue: number; won: number };
  cpl: number;
  roas: number | null;
  shareLeads: number;
};

const CHANNEL_FOR: Record<string, ChannelKey> = {
  'Google Ads': 'paid', 'Bing Ads': 'paid', 'Meta Ads': 'paid',
  'Google Organic': 'organic', 'Google Business Profile': 'organic',
  'Bing Organic': 'organic', 'Facebook': 'organic',
  'AI Search': 'organic', 'Other': 'organic',
  'Referral': 'word', 'Direct': 'word',
};

const CHANNEL_META: Record<ChannelKey, { label: string; tint: string; icon: ChannelGroup['icon'] }> = {
  paid:    { label: 'Paid Channels', tint: '#1BA8D4', icon: 'cash' },
  organic: { label: 'Organic / SEO', tint: '#0D3556', icon: 'trend' },
  word:    { label: 'Word of Mouth', tint: '#15A36A', icon: 'target' },
};

export async function getChannelGroups(window: MetricsWindow): Promise<ChannelGroup[]> {
  const rows = await getAcquisition(window);
  const grandLeads = rows.reduce((s, r) => s + r.leads, 0) || 1;
  const byKey = new Map<ChannelKey, AcquisitionRow[]>();
  for (const r of rows) {
    const k = CHANNEL_FOR[r.source] ?? 'organic';
    const arr = byKey.get(k) ?? [];
    arr.push(r);
    byKey.set(k, arr);
  }
  return (['paid', 'organic', 'word'] as ChannelKey[]).map(key => {
    const sources = byKey.get(key) ?? [];
    const totals = sources.reduce(
      (a, s) => ({
        leads: a.leads + s.leads,
        spend: a.spend + (s.spend ?? 0),
        revenue: a.revenue + s.revenue,
        won: a.won + s.won,
      }),
      { leads: 0, spend: 0, revenue: 0, won: 0 },
    );
    return {
      key,
      ...CHANNEL_META[key],
      sources,
      totals,
      cpl: totals.spend > 0 ? totals.spend / totals.leads : 0,
      roas: totals.spend > 0 ? totals.revenue / totals.spend : null,
      shareLeads: totals.leads / grandLeads,
    };
  });
}

// ============================================================
// Campaigns + Keywords — empty until ads sync runs
// ============================================================
export type CampaignRow = {
  name: string;
  channel: string;
  status: 'active' | 'paused' | 'ended';
  spend: number;
  leads: number;
  won: number;
  revenue: number;
};

export async function getCampaigns(window: MetricsWindow): Promise<CampaignRow[]> {
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('ads_spend_daily')
    .select('source, campaign_id, campaign_name, spend, conversions, conversion_value')
    .gte('date', window.startDate)
    .lte('date', window.endDate);
  if (error) throw new Error(`campaigns: ${error.message}`);
  type B = { name: string; channel: string; spend: number; leads: number; won: number; revenue: number };
  const buckets = new Map<string, B>();
  for (const r of data ?? []) {
    const key = `${r.source}:${r.campaign_id || '∅'}`;
    const b = buckets.get(key) ?? {
      name: r.campaign_name || r.campaign_id || 'Account-level',
      channel: r.source,
      spend: 0, leads: 0, won: 0, revenue: 0,
    };
    b.spend += Number(r.spend ?? 0);
    b.leads += Number(r.conversions ?? 0);
    b.revenue += Number(r.conversion_value ?? 0);
    buckets.set(key, b);
  }
  return [...buckets.values()].map(b => ({ ...b, status: 'active' as const }))
    .sort((a, b) => b.spend - a.spend);
}

export type KeywordRow = {
  term: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conv: number;
  cpc: number;
  jobs: number;
};

export async function getKeywords(window: MetricsWindow): Promise<KeywordRow[]> {
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('keywords_daily')
    .select('keyword, impressions, clicks, spend, conversions')
    .gte('date', window.startDate)
    .lte('date', window.endDate);
  if (error) throw new Error(`keywords: ${error.message}`);
  type B = { term: string; impressions: number; clicks: number; spend: number; jobs: number };
  const buckets = new Map<string, B>();
  for (const r of data ?? []) {
    const b = buckets.get(r.keyword) ?? { term: r.keyword, impressions: 0, clicks: 0, spend: 0, jobs: 0 };
    b.impressions += Number(r.impressions ?? 0);
    b.clicks += Number(r.clicks ?? 0);
    b.spend += Number(r.spend ?? 0);
    b.jobs += Number(r.conversions ?? 0);
    buckets.set(r.keyword, b);
  }
  return [...buckets.values()]
    .map(b => ({
      term: b.term,
      impressions: b.impressions,
      clicks: b.clicks,
      ctr: b.impressions > 0 ? b.clicks / b.impressions : 0,
      conv: b.clicks > 0 ? b.jobs / b.clicks : 0,
      cpc: b.clicks > 0 ? b.spend / b.clicks : 0,
      jobs: b.jobs,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20);
}
