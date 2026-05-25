// Customers-tab cards: KPIs, growth chart, segments donut, full roster table.

import { fmt } from '@/lib/format';
import { KpiCard } from '../KpiCard';
import { Donut } from '../charts/Donut';
import type {
  CustomersKpis,
  MonthlyGrowth,
  SegmentRow,
  CustomerRosterRow,
} from '@/lib/customers-metrics';

// ============================================================
// KPI strip
// ============================================================
export function CustomersKpiStrip({ k }: { k: CustomersKpis }) {
  return (
    <div className="row kpi-strip">
      <KpiCard
        feature
        icon="trend"
        label="Active Customers"
        value={fmt(k.active12m)}
        sub={<span>customers in last 12 mo</span>}
      />
      <KpiCard
        icon="trend"
        label="New This Month"
        value={fmt(k.newThisMonth)}
        sub={<span>{k.newThisWeek} this week</span>}
      />
      <KpiCard
        icon="target"
        label="Repeat Rate"
        value={k.repeatRate == null ? '—' : fmt(k.repeatRate, { pct: true, decimals: 0 })}
        sub={<span>multi-job customers</span>}
      />
      <KpiCard
        icon="cash"
        label="Avg Lifetime Value"
        value={k.avgLifetimeValue == null ? '—' : fmt(k.avgLifetimeValue, { currency: true, decimals: 0 })}
        sub={<span>across paying customers</span>}
      />
      <KpiCard
        icon="receipt"
        label="Total Customers"
        value={fmt(k.total)}
        sub={<span>full roster · all time</span>}
      />
      <KpiCard
        icon="down"
        label="Dormant"
        value={fmt(k.churned)}
        sub={<span>no job 12+ months</span>}
      />
    </div>
  );
}

// ============================================================
// Monthly growth bar chart — stacked New + Repeat
// ============================================================
export function CustomerGrowthChart({ rows }: { rows: MonthlyGrowth[] }) {
  const max = Math.max(1, ...rows.map(r => r.total));
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Growth</span>
          <h3 className="card-title">New &amp; Repeat Customers</h3>
          <div className="card-sub">Last 12 months · stacked</div>
        </div>
        <div className="legend">
          <span className="item">
            <span style={swatch('#1BA8D4')} />New
          </span>
          <span className="item">
            <span style={swatch('#0D3556')} />Repeat
          </span>
        </div>
      </div>
      <div className="card-b">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 220 }}>
          {rows.map(m => (
            <div
              key={m.month}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <div className="tiny" style={{ fontWeight: 700, marginBottom: 4 }}>{m.total}</div>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  height: `${(m.total / max) * 100}%`,
                  transition: 'height .4s',
                  minHeight: m.total > 0 ? 4 : 0,
                }}
              >
                <div style={{ flex: m.repeatCustomers, background: 'var(--navy-700)', borderRadius: '4px 4px 0 0' }} />
                <div style={{ flex: m.newCustomers, background: 'var(--cyan-600)' }} />
              </div>
              <div className="tiny muted" style={{ marginTop: 6 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Customer Segments donut + breakdown
// ============================================================
export function CustomerSegmentsCard({ rows }: { rows: SegmentRow[] }) {
  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Segments</span>
          <h3 className="card-title">Revenue by Segment</h3>
          <div className="card-sub">
            {fmt(totalRev, { currency: true, compact: true })} across {fmt(totalCount)} customers
          </div>
        </div>
      </div>
      <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 18, alignItems: 'center' }}>
        <Donut
          data={rows.map(s => ({ label: s.name, value: s.revenue || s.count, color: s.color }))}
          centerLabel="Customers"
          centerValue={fmt(totalCount)}
        />
        <div className="stack-v" style={{ gap: 10 }}>
          {rows.map(s => (
            <div key={s.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                <div className="stack-h" style={{ minWidth: 0 }}>
                  <span style={swatch(s.color)} />
                  <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{s.name}</span>
                </div>
                <div className="stack-h" style={{ gap: 12, flexShrink: 0 }}>
                  <span className="tiny muted">{s.count}</span>
                  <span className="num small" style={{ fontWeight: 700 }}>
                    {fmt(s.revenue, { currency: true, compact: true })}
                  </span>
                </div>
              </div>
              <div className="bar-track" style={{ height: 5 }}>
                <div
                  className="bar-fill"
                  style={{
                    width: `${(totalRev > 0 ? s.revenue / totalRev : s.count / totalCount) * 100}%`,
                    background: s.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Full Customer Roster table — 1,088 rows (paginated client-side)
// ============================================================
const STATUS_BADGE: Record<CustomerRosterRow['status'], string> = {
  vip:     'solid-cyan',
  active:  'green',
  new:     'cyan',
  dormant: 'amber',
};

export function CustomerRosterTable({ rows, limit = 50 }: { rows: CustomerRosterRow[]; limit?: number }) {
  const shown = rows.slice(0, limit);
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Customer roster</span>
          <h3 className="card-title">All Customers</h3>
          <div className="card-sub">
            {fmt(rows.length)} total · showing top {fmt(shown.length)} by lifetime value
          </div>
        </div>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="muted tiny" style={{ padding: 40, textAlign: 'center' }}>
            No customers cached yet.
          </div>
        ) : (
          <table className="flow">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>City</th>
                <th className="num">Jobs</th>
                <th className="num">Lifetime $</th>
                <th>Last Job</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div className="tiny muted">#{c.id}{c.since ? ` · since ${c.since.slice(0, 7)}` : ''}</div>
                  </td>
                  <td><span className="badge navy">{c.type}</span></td>
                  <td className="muted">{c.city ?? '—'}</td>
                  <td className="num">{fmt(c.jobs)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {c.lifetimeValue > 0 ? fmt(c.lifetimeValue, { currency: true, decimals: 0 }) : '—'}
                  </td>
                  <td className="small muted">{c.lastJob ?? '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[c.status]}`}>{c.status.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function swatch(bg: string): React.CSSProperties {
  return {
    width: 10, height: 10, borderRadius: 3, background: bg,
    display: 'inline-block', marginRight: 6, verticalAlign: -1, flexShrink: 0,
  };
}
