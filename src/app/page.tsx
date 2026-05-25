import { Suspense } from 'react';
import { TopBar, SubBar, PageFooter } from '@/components/Shell';
import { resolveWindow } from '@/lib/periods';
import { KpiCard } from '@/components/KpiCard';
import { AcquisitionTable } from '@/components/AcquisitionTable';
import { AcquisitionFunnel } from '@/components/AcquisitionFunnel';
import { RevenueByService } from '@/components/RevenueByService';
import { RevenueTrend } from '@/components/RevenueTrend';
import { JobMap } from '@/components/JobMap';
import { getSuburbDistribution } from '@/lib/suburbs';
import { SetupScreen } from '@/components/SetupScreen';
import { getConfigStatus } from '@/lib/config-check';
import {
  getOverviewKpis,
  getDailySeries,
  getAcquisition,
  getFunnel,
  getServiceCategories,
  getRecentSyncRuns,
  getActiveErrors,
} from '@/lib/metrics';
import { fmt } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const config = getConfigStatus();
  if (!config.ok) return <SetupScreen groups={config.groups} />;

  const win = resolveWindow(searchParams);
  const window = { startDate: win.startDate, endDate: win.endDate };
  const sourceFilter = typeof searchParams.source === 'string' ? searchParams.source : null;
  const periodLabel = win.source === 'custom'
    ? `${win.startDate} → ${win.endDate}`
    : win.period;


  let pageData: Awaited<ReturnType<typeof loadPageData>>;
  try {
    pageData = await loadPageData(window);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <main style={{ padding: '48px 32px', fontFamily: 'system-ui, sans-serif', maxWidth: 680 }}>
        <h2 style={{ color: '#c53030', marginBottom: 12, fontSize: 22 }}>Dashboard data error</h2>
        <p style={{ color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
          The dashboard couldn&apos;t load data from the database. This usually means the sync hasn&apos;t run yet
          or the database tables are still being set up.
        </p>
        <pre style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '12px 16px', borderRadius: 6, fontSize: 13, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {msg}
        </pre>
      </main>
    );
  }
  const [kpis, daily, acquisition, funnel, services, runs, suburbs, errorRuns] = pageData;

  const lastOk = runs.find(r => r.status === 'ok')?.started_at;
  const lastSyncLabel = lastOk
    ? new Date(lastOk).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })
    : 'never';
  // errorRuns set above via getActiveErrors() — only sources whose LATEST run failed

  // Sparkline data — last 14 days for KPI cards, dropping the last 2 trailing
  // days where SimPro data is still settling (otherwise the line ends with a
  // misleading downward cliff at the right edge of every card).
  const TRIM = 2;
  const sparkLeads = daily.leads.slice(-(14 + TRIM), -TRIM);
  const sparkJobs = daily.jobs.slice(-(14 + TRIM), -TRIM);
  const sparkRevenue = daily.revenue.slice(-(14 + TRIM), -TRIM);

  // Apply ?source= filter on top of the categorized acquisition rows.
  const filteredAcquisition = sourceFilter
    ? acquisition.filter(r => r.source === sourceFilter)
    : acquisition;

  // Suburb-weighted average distance — used for the Avg Distance KPI now
  // that real per-job geocoding isn't done yet.
  const suburbTotalJobs = suburbs.reduce((s, x) => s + x.jobs, 0);
  const suburbAvgKm = suburbTotalJobs > 0
    ? suburbs.reduce((s, x) => s + x.distKm * x.jobs, 0) / suburbTotalJobs
    : null;

  return (
    <>
      <TopBar syncErrors={errorRuns.length} />
      <Suspense>
        <SubBar title={`Good ${greeting()}, Pete`} crumb={`Dashboard · Overview · ${periodLabel}`} />
      </Suspense>

      <div className="page">
        {/* Sync health banner (only when something's broken).
            Shows EVERY failing source so multi-failure isn't silently hidden. */}
        {errorRuns.length > 0 && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--danger)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div className="stack-h">
              <span className="badge red">sync error</span>
              <span style={{ fontWeight: 600 }}>
                {errorRuns.length} source{errorRuns.length === 1 ? '' : 's'} failing
              </span>
            </div>
            {errorRuns.map(r => (
              <div key={r.id} style={{ paddingLeft: 4 }}>
                <strong>{r.source}</strong>{' '}
                <span style={{ opacity: 0.8 }}>{r.error_message?.slice(0, 200)}</span>
              </div>
            ))}
          </div>
        )}

        {/* KPI strip — 6 cards */}
        <div className="row kpi-strip">
          <KpiCard
            feature
            icon="cash"
            label={`Revenue·${win.source === 'custom' ? 'window' : win.period}`}
            value={kpis.revenue.value == null ? '—' : fmt(kpis.revenue.value, { currency: true, compact: true })}
            delta={kpis.revenue.delta}
            sub={
              kpis.revenue.prev != null ? (
                <>vs {fmt(kpis.revenue.prev, { currency: true, compact: true })} prev.</>
              ) : (
                <span style={{ opacity: 0.7 }}>SimPro 503 — see banner</span>
              )
            }
            sparkData={sparkRevenue.some(v => v > 0) ? sparkRevenue : undefined}
          />
          <KpiCard
            icon="trend"
            label="Leads"
            value={fmt(kpis.leads.value)}
            delta={kpis.leads.delta}
            sub={kpis.leads.prev != null ? `vs ${fmt(kpis.leads.prev)} prev.` : 'no prior data'}
            sparkData={sparkLeads.some(v => v > 0) ? sparkLeads : undefined}
          />
          <KpiCard
            icon="wrench"
            label="Jobs Done"
            value={fmt(kpis.jobsDone.value)}
            delta={kpis.jobsDone.delta}
            sub={
              kpis.jobsDone.value == null ? (
                <span style={{ opacity: 0.7 }}>Waiting on SimPro</span>
              ) : (
                `vs ${fmt(kpis.jobsDone.prev)} prev.`
              )
            }
            sparkData={sparkJobs.some(v => v > 0) ? sparkJobs : undefined}
          />
          <KpiCard
            icon="receipt"
            label="Avg Ticket"
            value={
              kpis.avgTicket.value == null
                ? '—'
                : fmt(kpis.avgTicket.value, { currency: true, decimals: 0 })
            }
            delta={kpis.avgTicket.delta}
            sub={
              kpis.avgTicket.value == null ? (
                <span style={{ opacity: 0.7 }}>Waiting on SimPro</span>
              ) : (
                'per completed job'
              )
            }
          />
          <KpiCard
            icon="map"
            label="Avg Distance"
            value={suburbAvgKm == null ? '—' : suburbAvgKm.toFixed(1)}
            unit={suburbAvgKm == null ? undefined : 'km'}
            sub={suburbAvgKm == null
              ? <span style={{ opacity: 0.7 }}>No suburb matches yet</span>
              : <span>weighted from Silverdale</span>}
          />
          <KpiCard
            icon="target"
            label="Quote→Job"
            value={
              kpis.quoteRate.value == null ? '—' : fmt(kpis.quoteRate.value, { pct: true, decimals: 1 })
            }
            delta={kpis.quoteRate.delta}
            sub="won / total leads"
          />
        </div>

        {/* Row 1: Revenue trend (3) + Revenue by service (2) */}
        <div className="row split-3-2">
          <RevenueTrend series={daily} leads={daily.leads} windowLabel={periodLabel} />
          <RevenueByService rows={services} />
        </div>

        {/* Row 2: Acquisition table (2) + Funnel (1) */}
        <div className="row split-2-1">
          <AcquisitionTable rows={filteredAcquisition} />
          <AcquisitionFunnel data={funnel} />
        </div>

        {/* Row 3: Job geography — Auckland tile with suburb density circles */}
        <JobMap suburbs={suburbs} />

        <PageFooter lastSync={lastSyncLabel} />
      </div>
    </>
  );
}

const NULL_KPI = { value: null, prev: null, delta: null };
const EMPTY_KPIS = { revenue: NULL_KPI, profit: NULL_KPI, margin: NULL_KPI, jobsDone: NULL_KPI, avgTicket: NULL_KPI, avgDistKm: NULL_KPI, quoteRate: NULL_KPI, leads: NULL_KPI };
const EMPTY_SERIES = { dates: [] as string[], revenue: [] as number[], jobs: [] as number[], leads: [] as number[] };
const EMPTY_FUNNEL = { impressions: null, leads: 0, quotesSent: 0, quotesWon: 0, costPerLead: null, costPerAcq: null };

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

function loadPageData(window: { startDate: string; endDate: string }) {
  return Promise.all([
    safe(() => getOverviewKpis(window), EMPTY_KPIS),
    safe(() => getDailySeries(window), EMPTY_SERIES),
    safe(() => getAcquisition(window), []),
    safe(() => getFunnel(window), EMPTY_FUNNEL),
    safe(() => getServiceCategories(window), []),
    safe(() => getRecentSyncRuns(8), []),
    safe(() => getSuburbDistribution(), []),
    safe(() => getActiveErrors(), []),
  ]);
}

function greeting() {
  // Use NZ local time — the dashboard is for Pete in Silverdale, not for whatever
  // timezone Vercel happens to run the route handler in (UTC by default).
  const h = Number(
    new Intl.DateTimeFormat('en-NZ', {
      timeZone: 'Pacific/Auckland',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  );
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
