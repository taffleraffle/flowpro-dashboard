// Operations-tab cards — KPIs + Hourly Load (real) + cleanly stubbed
// tech/fleet/inventory sections.

import { fmt } from '@/lib/format';
import { KpiCard } from '../KpiCard';
import type { OpsKpis, HourlyBucket, StatusBucket } from '@/lib/ops-metrics';

const PENDING = <span style={{ opacity: 0.7 }}>Pending SimPro</span>;

export function OpsKpiStrip({ k, windowLabel }: { k: OpsKpis; windowLabel?: string }) {
  const periodSub = windowLabel ?? '30D';
  return (
    <div className="row kpi-strip">
      <KpiCard
        feature
        icon="wrench"
        label="Open Jobs"
        value={fmt(k.openJobs)}
        sub={<span>not yet completed</span>}
      />
      <KpiCard
        icon="check"
        label="Completed Today"
        value={fmt(k.completedToday)}
        sub={<span>{k.completedThisWeek} this week</span>}
      />
      <KpiCard
        icon="receipt"
        label="Avg Job Value"
        value={k.avgJobValue == null ? '—' : fmt(k.avgJobValue, { currency: true, decimals: 0 })}
        sub={<span>{periodSub}</span>}
      />
      <KpiCard
        icon="target"
        label="Avg Response"
        value={k.avgResponseMin == null ? '—' : `${k.avgResponseMin}`}
        unit={k.avgResponseMin == null ? undefined : 'min'}
        sub={PENDING}
      />
      <KpiCard
        icon="trend"
        label="Tech Utilisation"
        value={k.techUtil == null ? '—' : fmt(k.techUtil, { pct: true, decimals: 0 })}
        sub={
          k.techUtil == null
            ? PENDING
            : (
              <span>
                {k.techCount} techs ·{' '}
                {k.avgHoursPerJob == null
                  ? periodSub
                  : `${k.avgHoursPerJob.toFixed(1)}h/job avg`}
              </span>
            )
        }
      />
      <KpiCard
        icon="check"
        label="First-Time Fix"
        value={k.firstTimeFix == null ? '—' : fmt(k.firstTimeFix, { pct: true, decimals: 0 })}
        sub={PENDING}
      />
    </div>
  );
}

// ============================================================
// Hourly job-load chart (REAL data)
// ============================================================
export function HourlyLoadChart({ rows }: { rows: HourlyBucket[] }) {
  const max = Math.max(1, ...rows.map(r => r.jobs));
  const hasData = rows.some(r => r.jobs > 0);
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Demand pattern</span>
          <h3 className="card-title">Jobs by Hour of Day</h3>
          <div className="card-sub">
            {hasData
              ? `Last 30 days · ${rows.reduce((s, r) => s + r.jobs, 0)} jobs · peak around ${rows.reduce((p, c) => (c.jobs > p.jobs ? c : p)).hour}`
              : 'No DateModified timestamps in window — sync writes UTC time only'}
          </div>
        </div>
      </div>
      <div className="card-b">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160 }}>
          {rows.map(h => {
            const intensity = h.jobs / max;
            return (
              <div
                key={h.hour}
                title={`${h.hour}: ${h.jobs} jobs`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <div className="tiny" style={{ fontWeight: 600, marginBottom: 4, opacity: intensity > 0.5 ? 1 : 0.5 }}>
                  {h.jobs}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: `${intensity * 100}%`,
                    background:
                      intensity > 0.7
                        ? 'var(--cyan-600)'
                        : intensity > 0.4
                        ? 'var(--cyan-300)'
                        : 'var(--navy-100)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all .2s',
                    minHeight: h.jobs > 0 ? 4 : 0,
                  }}
                />
                <div className="tiny muted" style={{ marginTop: 4 }}>{h.hour}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Open status distribution (real data — what's in flight right now)
// ============================================================
export function StatusBreakdown({ rows }: { rows: StatusBucket[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const palette = ['#1BA8D4', '#0D3556', '#7DD3E8', '#134268', '#2BBDE6', '#E8A93C', '#15A36A', '#93A1AE'];
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Pipeline</span>
          <h3 className="card-title">Open Job Status</h3>
          <div className="card-sub">{total} open · current snapshot</div>
        </div>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="muted tiny" style={{ padding: 40, textAlign: 'center' }}>
            No open jobs.
          </div>
        ) : (
          <table className="flow">
            <thead>
              <tr>
                <th>Status</th>
                <th className="num">Count</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.status}>
                  <td>
                    <div className="stack-h">
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: palette[i % palette.length], display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{r.status}</span>
                    </div>
                  </td>
                  <td className="num" style={{ fontWeight: 700 }}>{r.count}</td>
                  <td style={{ width: '40%' }}>
                    <div className="bar-track" style={{ height: 6 }}>
                      <div className="bar-fill" style={{ width: `${(r.count / total) * 100}%`, background: palette[i % palette.length] }} />
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
// Stubs for tech-data-dependent sections
// ============================================================
export function TechWeekGrid() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Utilisation grid</span>
          <h3 className="card-title">Tech Week · billable hours</h3>
          <div className="card-sub">Per-tech daily hours</div>
        </div>
        <span className="badge amber">Pending SimPro tech sync</span>
      </div>
      <div className="card-b">
        <div
          className="muted tiny"
          style={{
            padding: 40, textAlign: 'center',
            border: '1px dashed var(--border-2)', borderRadius: 8,
          }}
        >
          Activates once we sync the SimPro <code>/staff/</code> + <code>/schedules/</code>
          endpoints. Schema additions needed: <code>simpro_techs</code>, <code>simpro_schedules</code>.
        </div>
      </div>
    </div>
  );
}

export function SLATracker() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Service levels</span>
          <h3 className="card-title">SLA Compliance</h3>
        </div>
        <span className="badge amber">Pending response data</span>
      </div>
      <div className="card-b">
        <div
          className="muted tiny"
          style={{
            padding: 32, textAlign: 'center',
            border: '1px dashed var(--border-2)', borderRadius: 8,
          }}
        >
          SLA tracker computes from job creation → first contact → completion timestamps.
          We have <code>date_created</code> + <code>date_completed</code> but no first-response
          time. Needs SimPro activity log sync.
        </div>
      </div>
    </div>
  );
}

export function FleetCard() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Fleet</span>
          <h3 className="card-title">Vehicles</h3>
        </div>
        <span className="badge amber">Pending fleet sync</span>
      </div>
      <div className="card-b muted tiny" style={{ padding: 32, textAlign: 'center', border: '1px dashed var(--border-2)', borderRadius: 8, margin: 16 }}>
        Fleet table needs vehicle records — SimPro <code>/vehicles/</code> endpoint not synced yet.
      </div>
    </div>
  );
}

export function InventoryCard() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Stock</span>
          <h3 className="card-title">Inventory</h3>
        </div>
        <span className="badge amber">Pending inventory sync</span>
      </div>
      <div className="card-b muted tiny" style={{ padding: 32, textAlign: 'center', border: '1px dashed var(--border-2)', borderRadius: 8, margin: 16 }}>
        Stock table needs <code>simpro_inventory</code> migration + SimPro <code>/catalogInventories/</code> sync.
      </div>
    </div>
  );
}
