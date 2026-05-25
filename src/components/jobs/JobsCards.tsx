// Job-tab cards: KPIs, pipeline kanban, types table, all-jobs log.
// Most show clean empty states until SimPro sync unblocks.

import { fmt } from '@/lib/format';
import { Icon } from '../Icons';
import { KpiCard } from '../KpiCard';
import type { JobsKpis, PipelineStage, JobTypeRow, JobRow } from '@/lib/jobs-metrics';

// ============================================================
// KPI strip — 6 cards
// ============================================================
export function JobsKpiStrip({ k, windowLabel }: { k: JobsKpis; windowLabel?: string }) {
  const pendingHint = <span style={{ opacity: 0.7 }}>Pending SimPro</span>;
  const periodSub = windowLabel ?? '30D';
  return (
    <div className="row kpi-strip">
      <KpiCard
        feature
        icon="wrench"
        label="Active Jobs"
        value={fmt(k.active)}
        sub={k.active > 0 ? <span>{fmt(k.activeValue, { currency: true, compact: true })} value</span> : pendingHint}
      />
      <KpiCard
        icon="calendar"
        label="Scheduled Today"
        value={fmt(k.scheduledToday)}
        sub={k.scheduledToday > 0 ? <span>jobs booked for today</span> : pendingHint}
      />
      <KpiCard
        icon="check"
        label={`Completed · ${periodSub}`}
        value={k.completed30d == null ? '—' : fmt(k.completed30d)}
        sub={k.completed30d == null ? pendingHint : <span>across all services</span>}
      />
      <KpiCard
        icon="target"
        label="High Urgency"
        value={fmt(k.highUrgency)}
        sub={pendingHint}
      />
      <KpiCard
        icon="receipt"
        label="Avg Job Value"
        value={k.avgTicket == null ? '—' : fmt(k.avgTicket, { currency: true, decimals: 0 })}
        sub={k.avgTicket == null ? pendingHint : <span>per completed</span>}
      />
      <KpiCard
        icon="target"
        label="On-Time %"
        value={k.onTimePct == null ? '—' : fmt(k.onTimePct, { pct: true, decimals: 0 })}
        sub={k.onTimePct == null ? pendingHint : <span>within 15min window</span>}
      />
    </div>
  );
}

// ============================================================
// Pipeline kanban — six stage columns
// ============================================================
const STAGE_BADGE: Record<string, string> = {
  Inquiry: 'navy', Quoted: 'cyan', Scheduled: 'cyan',
  'On Site': 'amber', Invoiced: 'navy', Paid: 'green',
};

export function JobPipelineKanban({ stages }: { stages: PipelineStage[] }) {
  const totalJobs = stages.reduce((s, st) => s + st.jobs.length, 0);
  const totalValue = stages.reduce((s, st) => s + st.value, 0);

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Job pipeline</span>
          <h3 className="card-title">Active Pipeline</h3>
          <div className="card-sub">
            {totalJobs > 0
              ? `${totalJobs} active · ${fmt(totalValue, { currency: true, compact: true })} pipeline value`
              : 'Pending SimPro · no active jobs to display'}
          </div>
        </div>
      </div>
      <div className="card-b" style={{ padding: 16 }}>
        {totalJobs === 0 ? (
          <div
            className="muted tiny"
            style={{
              padding: '40px 20px', textAlign: 'center',
              border: '1px dashed var(--border-2)', borderRadius: 8,
            }}
          >
            Kanban activates once SimPro sync runs. Each column is a stage (Inquiry → Paid)
            with jobs as cards.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(160px, 1fr))', gap: 12, overflowX: 'auto' }}>
            {stages.map(st => (
              <div key={st.stage} className="pipe-col">
                <div className="pipe-col-h">
                  <span className={`badge ${STAGE_BADGE[st.stage] ?? 'navy'}`}>{st.stage.toUpperCase()}</span>
                  <span className="count">{st.jobs.length}</span>
                </div>
                {st.jobs.slice(0, 6).map(j => (
                  <div key={j.id} className="pipe-card">
                    <div className="title">{j.title}</div>
                    <div className="meta">
                      <span>{j.site ?? '—'}</span>
                      <span className="price">${j.value.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {st.jobs.length > 6 && (
                  <div className="muted tiny" style={{ textAlign: 'center', padding: 6 }}>
                    + {st.jobs.length - 6} more
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Most common job types table
// ============================================================
const TYPE_PALETTE = ['#1BA8D4', '#0D3556', '#7DD3E8', '#134268', '#2BBDE6', '#E8A93C', '#15A36A', '#93A1AE'];

export function JobTypesTable({ rows }: { rows: JobTypeRow[] }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Service breakdown</span>
          <h3 className="card-title">Most Common Job Types</h3>
          <div className="card-sub">Completed jobs · current window</div>
        </div>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="muted tiny" style={{ padding: 40, textAlign: 'center' }}>
            No completed jobs in window. Activates once SimPro sync runs.
          </div>
        ) : (
          <table className="flow">
            <thead>
              <tr>
                <th>Job Type</th>
                <th className="num">Count</th>
                <th className="num">Avg Value</th>
                <th className="num">Total Rev.</th>
                <th>Frequency</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.type}>
                  <td>
                    <div className="stack-h">
                      <span
                        style={{
                          width: 10, height: 10, borderRadius: 3,
                          background: TYPE_PALETTE[i % TYPE_PALETTE.length],
                          display: 'inline-block', flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>{r.type}</span>
                    </div>
                  </td>
                  <td className="num">{r.count}</td>
                  <td className="num">{fmt(r.avgValue, { currency: true, decimals: 0 })}</td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {fmt(r.totalRevenue, { currency: true, compact: true })}
                  </td>
                  <td style={{ width: '30%' }}>
                    <div className="bar-track" style={{ height: 6 }}>
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(r.count / max) * 100}%`,
                          background: TYPE_PALETTE[i % TYPE_PALETTE.length],
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Duration vs Value scatter — empty until SimPro provides duration
// ============================================================
export function DurationValueScatter() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Distribution</span>
          <h3 className="card-title">Duration vs Value</h3>
          <div className="card-sub">Each dot = 1 completed job</div>
        </div>
        <span className="badge amber">Pending SimPro</span>
      </div>
      <div className="card-b">
        <div
          className="muted tiny"
          style={{
            height: 240, display: 'grid', placeItems: 'center',
            border: '1px dashed var(--border-2)', borderRadius: 8,
          }}
        >
          Scatter activates once SimPro provides job duration (minutes) per completed job.
          Schema is wired — needs <code>simpro_jobs.duration_minutes</code> in next migration.
        </div>
      </div>
    </div>
  );
}

// ============================================================
// All Jobs table — flat list of every job in window
// ============================================================
const STAGE_BADGE_MAP: Record<string, string> = {
  Inquiry: 'navy', Quoted: 'cyan', Scheduled: 'cyan',
  'On Site': 'amber', Invoiced: 'navy', Paid: 'green', Complete: 'green',
};

export function AllJobsTable({ rows }: { rows: JobRow[] }) {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">All jobs</span>
          <h3 className="card-title">Job Log</h3>
          <div className="card-sub">
            {rows.length > 0 ? `${rows.length} shown · current window` : 'No jobs cached yet'}
          </div>
        </div>
        <div className="stack-h">
          <button className="btn" type="button"><Icon name="filter" size={12} />Filter</button>
        </div>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="muted tiny" style={{ padding: 40, textAlign: 'center' }}>
            No jobs in window. Run a SimPro sync from Settings → Trigger sync.
          </div>
        ) : (
          <table className="flow">
            <thead>
              <tr>
                <th>Job</th>
                <th>Title</th>
                <th>Site</th>
                <th>Stage</th>
                <th className="num">Distance</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(j => {
                const stage = j.is_complete ? 'Paid' : (j.status ?? 'Inquiry');
                return (
                  <tr key={j.id}>
                    <td><span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>#{j.id}</span></td>
                    <td style={{ fontWeight: 600 }}>{j.title}</td>
                    <td className="muted">{j.site_address ?? '—'}</td>
                    <td><span className={`badge ${STAGE_BADGE_MAP[stage] ?? 'navy'}`}>{stage.toUpperCase()}</span></td>
                    <td className="num">{j.distance_km != null ? `${j.distance_km.toFixed(1)} km` : '—'}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {j.total_ex_tax > 0 ? fmt(j.total_ex_tax, { currency: true, decimals: 0 }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
