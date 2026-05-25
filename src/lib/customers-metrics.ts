import { unstable_cache } from 'next/cache';
import { getServerSupabase } from './supabase';

// ============================================================
// Customers tab aggregators. Reads from `v_customer_summary` (a
// per-customer pre-aggregate view) instead of paging through all
// ~17k simpro_jobs rows on every cold cache miss. Dropped 16s → <2s.
// View defined in supabase/migrations/005_customer_summary_view.sql.
// ============================================================

export type CustomersKpis = {
  total: number;
  active12m: number;
  newThisMonth: number;
  newThisWeek: number;
  repeatRate: number | null;        // % of customers with >1 job
  avgLifetimeValue: number | null;
  totalRevenue: number;
  churned: number;                  // active customers without a job in 12+ months
};

export type MonthlyGrowth = {
  month: string;       // "2025-06"
  label: string;       // "Jun"
  newCustomers: number;
  repeatCustomers: number;
  total: number;
};

export type SegmentRow = {
  name: 'VIP' | 'Active' | 'Light' | 'New' | 'Dormant';
  color: string;
  count: number;
  revenue: number;
};

export type CustomerRosterRow = {
  id: number;
  name: string;
  type: 'Company' | 'Individual';
  city: string | null;
  jobs: number;
  lifetimeValue: number;
  lastJob: string | null;
  since: string | null;
  status: 'vip' | 'active' | 'new' | 'dormant';
};

const SEGMENT_COLORS: Record<SegmentRow['name'], string> = {
  VIP:     '#1BA8D4',
  Active:  '#0D3556',
  Light:   '#7DD3E8',
  New:     '#15A36A',
  Dormant: '#93A1AE',
};

type SummaryRow = {
  id: number;
  company_name: string | null;
  given_name: string | null;
  family_name: string | null;
  address_city: string | null;
  address_postcode: string | null;
  raw: Record<string, unknown> | null;
  jobs_count: number;
  total_revenue: number | string;
  first_job_date: string | null;
  last_job_date: string | null;
};

// supabase-js still caps a single .select() at 1000 rows; the view has ~1k
// customer rows so we explicitly page in case of growth.
async function fetchAllSummary(): Promise<SummaryRow[]> {
  const sb = getServerSupabase();
  const PAGE = 1000;
  const out: SummaryRow[] = [];
  for (let from = 0; from < 50_000; from += PAGE) {
    const { data, error } = await sb
      .from('v_customer_summary')
      .select('id, company_name, given_name, family_name, address_city, address_postcode, raw, jobs_count, total_revenue, first_job_date, last_job_date')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as SummaryRow[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export const getCustomersBundle = unstable_cache(
  async () => {
    const summary = await fetchAllSummary();

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)).toISOString().slice(0, 10);

    // -------- KPIs + Roster --------
    let active12m = 0;
    let newThisMonth = 0;
    let newThisWeek = 0;
    let churned = 0;
    let totalRevenue = 0;
    let repeatCustomers = 0;
    let customersWithJobs = 0;

    const roster: (CustomerRosterRow & { _segment: SegmentRow['name'] })[] = [];

    for (const c of summary) {
      const raw = (c.raw ?? {}) as Record<string, unknown>;
      const type = (typeof raw.Type === 'string' ? raw.Type : 'Company') as 'Company' | 'Individual';
      const dateCreated = typeof raw.DateCreated === 'string' ? raw.DateCreated.slice(0, 10) : null;
      const name = c.company_name
        || [c.given_name, c.family_name].filter(Boolean).join(' ')
        || `Customer #${c.id}`;
      const revenue = Number(c.total_revenue ?? 0);
      const jobs = Number(c.jobs_count ?? 0);
      const lastJob = c.last_job_date;
      const firstJob = c.first_job_date;
      const since = firstJob ?? dateCreated;

      if (lastJob && lastJob >= twelveMonthsAgo) active12m += 1;
      if (since && since >= monthStart) newThisMonth += 1;
      if (since && since >= weekStart) newThisWeek += 1;
      if (lastJob && lastJob < twelveMonthsAgo && jobs > 0) churned += 1;
      if (jobs > 1) repeatCustomers += 1;
      if (revenue > 0) {
        totalRevenue += revenue;
        customersWithJobs += 1;
      }

      let status: CustomerRosterRow['status'];
      let segmentName: SegmentRow['name'];
      if (since && since >= twelveMonthsAgo && jobs <= 1) {
        status = 'new'; segmentName = 'New';
      } else if (revenue >= 20_000) {
        status = 'vip'; segmentName = 'VIP';
      } else if (lastJob && lastJob >= twelveMonthsAgo) {
        status = 'active'; segmentName = revenue >= 3000 ? 'Active' : 'Light';
      } else {
        status = 'dormant'; segmentName = 'Dormant';
      }

      roster.push({
        id: c.id,
        name,
        type,
        city: c.address_city,
        jobs,
        lifetimeValue: revenue,
        lastJob,
        since,
        status,
        _segment: segmentName,
      });
    }

    const kpis: CustomersKpis = {
      total: summary.length,
      active12m,
      newThisMonth,
      newThisWeek,
      repeatRate: customersWithJobs > 0 ? repeatCustomers / customersWithJobs : null,
      avgLifetimeValue: customersWithJobs > 0 ? totalRevenue / customersWithJobs : null,
      totalRevenue,
      churned,
    };

    // -------- Segments --------
    const segMap = new Map<SegmentRow['name'], { count: number; revenue: number }>();
    for (const r of roster) {
      const m = segMap.get(r._segment) ?? { count: 0, revenue: 0 };
      m.count += 1;
      m.revenue += r.lifetimeValue;
      segMap.set(r._segment, m);
    }
    const segments: SegmentRow[] = (['VIP', 'Active', 'Light', 'New', 'Dormant'] as SegmentRow['name'][])
      .map(name => {
        const m = segMap.get(name) ?? { count: 0, revenue: 0 };
        return { name, color: SEGMENT_COLORS[name], count: m.count, revenue: m.revenue };
      })
      .filter(s => s.count > 0);

    // -------- Monthly growth (last 12 months) --------
    const growth: MonthlyGrowth[] = [];
    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let m = 11; m >= 0; m--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1));
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      growth.push({
        month: ym,
        label: monthLabels[d.getUTCMonth()],
        newCustomers: 0,
        repeatCustomers: 0,
        total: 0,
      });
    }
    const growthIdx = new Map(growth.map((g, i) => [g.month, i] as const));

    // "New" = first job in that month — derive from each customer's firstJob.
    for (const r of roster) {
      if (!r.lastJob && !r.since) continue;
      const firstYM = (r.since ?? '').slice(0, 7);
      const idx = growthIdx.get(firstYM);
      if (idx != null) growth[idx].newCustomers += 1;
    }

    // Total active customers per month from v_customer_growth_monthly.
    // Repeat = active − new (any customer who had a job that month but it wasn't their first).
    const sb = getServerSupabase();
    const { data: monthly, error: mErr } = await sb
      .from('v_customer_growth_monthly')
      .select('month, active_customers');
    if (mErr) throw new Error(mErr.message);
    const activeByMonth = new Map<string, number>(
      (monthly ?? []).map(m => [String(m.month), Number(m.active_customers ?? 0)]),
    );
    for (const g of growth) {
      const total = activeByMonth.get(g.month) ?? 0;
      g.repeatCustomers = Math.max(0, total - g.newCustomers);
      g.total = total;
    }

    roster.sort((a, b) => b.lifetimeValue - a.lifetimeValue);

    // Strip the internal _segment field before returning
    const cleanRoster: CustomerRosterRow[] = roster.map(({ _segment: _s, ...rest }) => {
      void _s;
      return rest;
    });

    return { kpis, segments, growth, roster: cleanRoster };
  },
  ['customers-bundle-v2-view'],
  { revalidate: 300, tags: ['dashboard'] },
);
