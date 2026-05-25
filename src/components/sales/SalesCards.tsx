// Sales-tab cards: KPIs, 12-week trend, profit margin, weekday bars,
// active quotes (from real WC data), top customers (from real WC data).

import { fmt } from '@/lib/format';
import { KpiCard } from '../KpiCard';
import { AreaChart } from '../charts/AreaChart';
import type {
  SalesKpis,
  WeeklyBucket,
  WeekdayBucket,
  QuoteRow,
  TopCustomerRow,
} from '@/lib/sales-metrics';

// ============================================================
// KPI strip — 6 cards
// ============================================================
export function SalesKpiStrip({ k, windowLabel }: { k: SalesKpis; windowLabel?: string }) {
  const pendingSim = <span style={{ opacity: 0.7 }}>Pending SimPro</span>;
  const periodSub = windowLabel ?? '30D';
  return (
    <div className="row kpi-strip">
      <KpiCard
        feature
        icon="cash"
        label="Gross Revenue"
        value={k.grossRevenue == null ? '—' : fmt(k.grossRevenue / 1000, { decimals: 1 })}
        unit={k.grossRevenue == null ? undefined : 'k'}
        sub={k.grossRevenue == null ? pendingSim : <span>{periodSub} total</span>}
      />
      <KpiCard
        icon="trend"
        label="Gross Profit"
        value={k.grossProfit == null ? '—' : fmt(k.grossProfit, { currency: true, compact: true })}
        sub={k.grossProfit == null ? pendingSim : <span>{fmt(k.margin, { pct: true, decimals: 1 })} margin</span>}
      />
      <KpiCard
        icon="receipt"
        label="Avg Ticket"
        value={k.avgTicket == null ? '—' : fmt(k.avgTicket, { currency: true, decimals: 0 })}
        sub={k.avgTicket == null ? pendingSim : <span>per completed job</span>}
      />
      <KpiCard
        icon="target"
        label="Quote Win Rate"
        value={k.quoteWinRate == null ? '—' : fmt(k.quoteWinRate, { pct: true, decimals: 0 })}
        sub={<span>{k.acceptedQuotes} of {k.totalQuotes} quotes</span>}
      />
      <KpiCard
        icon="trend"
        label="Repeat Revenue"
        value={k.repeatRevenue == null ? '—' : fmt(k.repeatRevenue, { currency: true, compact: true })}
        sub={
          k.repeatRevenueShare == null
            ? <span>{periodSub}</span>
            : <span>{fmt(k.repeatRevenueShare, { pct: true, decimals: 0 })} of revenue</span>
        }
      />
      <KpiCard
        icon="up"
        label="MoM Growth"
        value={k.momGrowth == null ? '—' : (k.momGrowth > 0 ? '+' : '') + fmt(k.momGrowth, { pct: true, decimals: 1 })}
        sub={k.momGrowth == null ? pendingSim : <span>vs prior {periodSub}</span>}
      />
    </div>
  );
}

// ============================================================
// 12-week trend area chart (leads when revenue empty)
// ============================================================
export function SalesTrend12Wk({ rows }: { rows: WeeklyBucket[] }) {
  const labels = rows.map(r => r.label);
  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalQuotes = rows.reduce((s, r) => s + r.quotes, 0);
  const hasRevenue = totalRev > 0;

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">12-week trend</span>
          <h3 className="card-title">
            {hasRevenue ? 'Revenue, Quotes & Leads' : 'Quotes & Leads · 12 weeks'}
          </h3>
          <div className="card-sub">Quarterly view · weekly buckets</div>
        </div>
        <div className="legend">
          {hasRevenue && (
            <span className="item">
              <span style={swatch('#1BA8D4')} />Revenue <b style={{ marginLeft: 4 }}>{fmt(totalRev, { currency: true, compact: true })}</b>
            </span>
          )}
          <span className="item">
            <span style={swatch('#0D3556')} />Quotes <b style={{ marginLeft: 4 }}>{fmt(totalQuotes)}</b>
          </span>
          <span className="item">
            <span style={swatch('#7DD3E8')} />Leads <b style={{ marginLeft: 4 }}>{fmt(totalLeads)}</b>
          </span>
        </div>
      </div>
      <div className="card-b">
        <AreaChart
          height={280}
          labels={labels}
          currency={hasRevenue}
          series={
            hasRevenue
              ? [
                  { name: 'Revenue', color: '#1BA8D4', values: rows.map(r => r.revenue), areaOpacity: 0.16 },
                  { name: 'Quotes',  color: '#0D3556', values: rows.map(r => r.quotes),  areaOpacity: 0.10 },
                  { name: 'Leads',   color: '#7DD3E8', values: rows.map(r => r.leads),   areaOpacity: 0.06 },
                ]
              : [
                  { name: 'Leads',  color: '#1BA8D4', values: rows.map(r => r.leads),   areaOpacity: 0.18 },
                  { name: 'Quotes', color: '#0D3556', values: rows.map(r => r.quotes),  areaOpacity: 0.10, dashed: true },
                ]
          }
        />
        {!hasRevenue && (
          <div className="muted tiny" style={{ marginTop: 8, textAlign: 'center' }}>
            Revenue line activates once SimPro completed-jobs sync runs.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Profit margin by service line — needs SimPro categorization
// ============================================================
export function ProfitMarginByService() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Profitability</span>
          <h3 className="card-title">Margin by Service Line</h3>
          <div className="card-sub">Revenue · cost · margin %</div>
        </div>
        <span className="badge amber">Pending SimPro</span>
      </div>
      <div className="card-b">
        <div
          className="muted tiny"
          style={{
            padding: '40px 20px', textAlign: 'center',
            border: '1px dashed var(--border-2)', borderRadius: 8,
          }}
        >
          Margin table activates once SimPro completed-jobs sync runs and includes job category +
          cost data. Schema is wired in <code>simpro_jobs</code>.
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Revenue by day of week (real WC leads + SimPro when available)
// ============================================================
export function RevenueByWeekday({ rows }: { rows: WeekdayBucket[] }) {
  const hasRevenue = rows.some(r => r.revenue > 0);
  const valFor = (r: WeekdayBucket) => (hasRevenue ? r.revenue : r.leads);
  const max = Math.max(1, ...rows.map(valFor));
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Patterns</span>
          <h3 className="card-title">{hasRevenue ? 'Revenue by Day' : 'Leads by Day'}</h3>
          <div className="card-sub">Within selected period · weekend in navy</div>
        </div>
      </div>
      <div className="card-b">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, marginBottom: 10 }}>
          {rows.map((r, i) => (
            <div
              key={r.day}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
            >
              <div className="num tiny" style={{ fontWeight: 700, marginBottom: 4 }}>
                {hasRevenue
                  ? '$' + (r.revenue / 1000).toFixed(1) + 'k'
                  : fmt(r.leads)}
              </div>
              <div
                style={{
                  width: '100%',
                  height: `${(valFor(r) / max) * 100}%`,
                  background: i >= 5
                    ? 'var(--navy-100)'
                    : 'linear-gradient(180deg, var(--cyan-500), var(--cyan-700))',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height .6s ease',
                  minHeight: 2,
                }}
              />
              <div className="tiny muted" style={{ marginTop: 6 }}>{r.day}</div>
              <div className="tiny" style={{ fontWeight: 600 }}>{hasRevenue ? r.leads : ''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Quotes Pipeline (active quotes from WC quotable=true leads)
// ============================================================
export function QuotesPipelineTable({ rows }: { rows: QuoteRow[] }) {
  const total = rows.reduce((s, q) => s + q.amount, 0);
  const statusBadge: Record<QuoteRow['status'], string> = {
    open: 'cyan', sent: 'navy', accepted: 'green', declined: 'red', expired: 'amber',
  };
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Quotes</span>
          <h3 className="card-title">Active Quotes</h3>
          <div className="card-sub">
            {rows.length} quotes · {fmt(total, { currency: true, compact: true })} total value
            <span className="muted"> · WhatConverts quotable leads</span>
          </div>
        </div>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="muted tiny" style={{ padding: 40, textAlign: 'center' }}>
            No quotable leads in the last 60 days.
          </div>
        ) : (
          <table className="flow">
            <thead>
              <tr>
                <th>Quote</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Status</th>
                <th className="num">Amount</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(q => (
                <tr key={q.id}>
                  <td><span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>#{q.id}</span></td>
                  <td style={{ fontWeight: 600 }}>{q.customer}</td>
                  <td className="muted tiny">{q.contact}</td>
                  <td><span className="badge navy">{q.source ?? 'unknown'}</span></td>
                  <td><span className={`badge ${statusBadge[q.status]}`}>{q.status.toUpperCase()}</span></td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {q.amount > 0 ? fmt(q.amount, { currency: true, decimals: 0 }) : '—'}
                  </td>
                  <td className="tiny muted">{q.created}</td>
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
// Top customers by lifetime value (proxy from WC sales_value)
// ============================================================
export function TopCustomersBySpend({ rows }: { rows: TopCustomerRow[] }) {
  const max = rows[0]?.lifetimeValue ?? 1;
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Top accounts</span>
          <h3 className="card-title">Highest Lifetime Value</h3>
          <div className="card-sub">
            {rows.length > 0
              ? `Top ${rows.length} by WC-recorded sales · all time`
              : 'No customers with recorded sales yet'}
          </div>
        </div>
      </div>
      <div className="card-b">
        {rows.length === 0 ? (
          <div className="muted tiny" style={{ padding: 32, textAlign: 'center' }}>
            Populates once WhatConverts leads have <code>sales_value</code> recorded, or once
            SimPro customer-level revenue sync runs.
          </div>
        ) : (
          <div className="stack-v" style={{ gap: 10 }}>
            {rows.map(c => (
              <div
                key={c.rank}
                style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 10, alignItems: 'center' }}
              >
                <span
                  className="num"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--muted)' }}
                >
                  {c.rank}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {c.name}
                  </div>
                  <div className="bar-track" style={{ height: 5, marginTop: 4 }}>
                    <div
                      className="bar-fill"
                      style={{ width: `${(c.lifetimeValue / max) * 100}%`, background: 'var(--cyan-600)' }}
                    />
                  </div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>
                    {c.jobs} job{c.jobs === 1 ? '' : 's'} · since {c.since || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num display" style={{ fontSize: 16 }}>
                    ${(c.lifetimeValue / 1000).toFixed(1)}k
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function swatch(bg: string): React.CSSProperties {
  return {
    width: 10, height: 10, borderRadius: 3, background: bg,
    display: 'inline-block', marginRight: 6, verticalAlign: -1,
  };
}
