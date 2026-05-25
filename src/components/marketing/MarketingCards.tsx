// Marketing-tab cards: KPI strip, Rolling Summary table, Daily Tracker.
// Spreadsheet-style threshold colouring matches the standalone reference.

import { fmt } from '@/lib/format';
import { Icon } from '../Icons';
import { KpiCard } from '../KpiCard';
import {
  TH,
  thresholdClass,
  type MarketingRolling,
  type DailyTrackerRow,
} from '@/lib/marketing-metrics';

// ============================================================
// KPI strip — uses the user-selected window (drops back to 30d
// when no window is supplied).
// ============================================================
export function MarketingKpiStrip({
  rolling,
  windowLabel,
}: {
  rolling: MarketingRolling;
  windowLabel?: string;
}) {
  const r = rolling.window ?? rolling.d30;
  const periodSub = windowLabel ?? '30 days';
  return (
    <div className="row kpi-strip">
      <KpiCard
        feature
        icon="cash"
        label="Adspend"
        value={fmt(r.adspend, { currency: true, compact: true })}
        sub={<span>{periodSub} · paid channels</span>}
      />
      <KpiCard
        icon="trend"
        label="Leads"
        value={fmt(r.leads)}
        sub={<span>{r.qualifiedQuotes} qualified quotes</span>}
      />
      <KpiCard
        icon="receipt"
        label="Cost / Lead"
        value={r.cpl > 0 ? fmt(r.cpl, { currency: true, decimals: 2 }) : '—'}
        sub={<span>Target &lt; ${TH.cpl}</span>}
        delta={r.cpl > 0 ? (TH.cpl - r.cpl) / TH.cpl : null}
      />
      <KpiCard
        icon="target"
        label="Lead → Quote"
        value={fmt(r.leadToQuote, { pct: true, decimals: 1 })}
        sub={<span>Target &gt; {(TH.leadToQuote * 100).toFixed(0)}%</span>}
        delta={r.leadToQuote - TH.leadToQuote}
      />
      <KpiCard
        icon="check"
        label="Close Rate"
        value={r.closeRate > 0 ? fmt(r.closeRate, { pct: true, decimals: 1 }) : '—'}
        sub={<span>Target &gt; {(TH.closeRate * 100).toFixed(0)}%</span>}
        delta={r.closeRate > 0 ? r.closeRate - TH.closeRate : null}
      />
      <KpiCard
        icon="trend"
        label="ROAS"
        value={r.roas > 0 ? r.roas.toFixed(2) + 'x' : '—'}
        sub={<span>Target &gt; {TH.roas}x</span>}
        delta={r.roas > 0 ? (r.roas - TH.roas) / TH.roas : null}
      />
    </div>
  );
}

// ============================================================
// Rolling Summary table — 4 rows (4D, 7D, 30D, MTD)
// ============================================================
export function RollingSummaryTable({ rolling }: { rolling: MarketingRolling }) {
  const rows = [
    { label: '4 Days', data: rolling.d4 },
    { label: '7 Days', data: rolling.d7 },
    { label: '30 Days', data: rolling.d30 },
    { label: 'MTD', data: rolling.mtd },
  ];
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Trailing performance</span>
          <h3 className="card-title">Rolling Marketing KPIs</h3>
          <div className="card-sub">Aggregated · color coded vs targets</div>
        </div>
        <div className="legend">
          <span className="item"><span style={swatch('#15A36A')} />Meeting target</span>
          <span className="item"><span style={swatch('#E8A93C')} />Within 5%</span>
          <span className="item"><span style={swatch('#D14543')} />Below target</span>
        </div>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="flow tracker">
            <thead>
              <tr>
                <th style={{ minWidth: 90 }}>Trailing</th>
                <th className="num">Adspend</th>
                <th className="num">Leads</th>
                <th className="num th-target">CPL<div className="th-sub">&lt; ${TH.cpl}</div></th>
                <th className="num">Quotes</th>
                <th className="num th-target">L→Q %<div className="th-sub">&gt; {TH.leadToQuote * 100}%</div></th>
                <th className="num th-target">CPQ<div className="th-sub">&lt; ${TH.cpq}</div></th>
                <th className="num">Quotable $</th>
                <th className="num">Avg Quote</th>
                <th className="num">Jobs</th>
                <th className="num th-target">Close %<div className="th-sub">&gt; {TH.closeRate * 100}%</div></th>
                <th className="num th-target">Cost/Job<div className="th-sub">&lt; ${TH.cpj}</div></th>
                <th className="num">Contracted $</th>
                <th className="num th-target">ROAS<div className="th-sub">&gt; {TH.roas}x</div></th>
                <th className="num">$/Lead</th>
                <th className="num">$/Quote</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const d = row.data;
                return (
                  <tr key={i} className={i === 2 ? 'row-emph' : ''}>
                    <td><span className="badge solid-navy">{row.label}</span></td>
                    <td className="num">{fmt(d.adspend, { currency: true, decimals: 0 })}</td>
                    <td className="num">{d.leads}</td>
                    <td className={`num ${d.adspend > 0 ? thresholdClass(d.cpl, TH.cpl, 'below') : ''}`}>
                      {d.adspend > 0 ? fmt(d.cpl, { currency: true, decimals: 2 }) : '—'}
                    </td>
                    <td className="num">{d.qualifiedQuotes}</td>
                    <td className={`num ${d.leads > 0 ? thresholdClass(d.leadToQuote, TH.leadToQuote, 'above') : ''}`}>
                      {d.leads > 0 ? fmt(d.leadToQuote, { pct: true, decimals: 1 }) : '—'}
                    </td>
                    <td className={`num ${d.adspend > 0 ? thresholdClass(d.cpq, TH.cpq, 'below') : ''}`}>
                      {d.adspend > 0 ? fmt(d.cpq, { currency: true, decimals: 2 }) : '—'}
                    </td>
                    <td className="num">{fmt(d.quotableValue, { currency: true, decimals: 0 })}</td>
                    <td className="num">{d.qualifiedQuotes > 0 ? fmt(d.avgQuoteValue, { currency: true, decimals: 0 }) : '—'}</td>
                    <td className="num">{d.jobsClosed}</td>
                    <td className={`num ${d.qualifiedQuotes > 0 ? thresholdClass(d.closeRate, TH.closeRate, 'above') : ''}`}>
                      {d.qualifiedQuotes > 0 ? fmt(d.closeRate, { pct: true, decimals: 1 }) : '—'}
                    </td>
                    <td className={`num ${d.adspend > 0 && d.jobsClosed > 0 ? thresholdClass(d.cpj, TH.cpj, 'below') : ''}`}>
                      {d.adspend > 0 && d.jobsClosed > 0 ? fmt(d.cpj, { currency: true, decimals: 2 }) : '—'}
                    </td>
                    <td className="num">{fmt(d.contractedRevenue, { currency: true, decimals: 0 })}</td>
                    <td className={`num ${d.adspend > 0 ? thresholdClass(d.roas, TH.roas, 'above') : ''}`}>
                      {d.adspend > 0 ? d.roas.toFixed(2) + 'x' : '—'}
                    </td>
                    <td className="num">{d.leads > 0 ? fmt(d.revPerLead, { currency: true, decimals: 0 }) : '—'}</td>
                    <td className="num">{d.qualifiedQuotes > 0 ? fmt(d.revPerQuote, { currency: true, decimals: 0 }) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Daily Tracker — the original Google Sheets replica
// ============================================================
export function DailyTracker({ rows }: { rows: DailyTrackerRow[] }) {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Daily log</span>
          <h3 className="card-title">Daily Marketing Tracker</h3>
          <div className="card-sub">Last {rows.length} days · scroll for more · color shows vs target</div>
        </div>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <table className="flow tracker daily">
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 2, minWidth: 96 }}>Date</th>
                <th className="num">Adspend</th>
                <th className="num">Leads</th>
                <th className="num th-target">CPL</th>
                <th className="num">Quotes</th>
                <th className="num th-target">L→Q %</th>
                <th className="num th-target">CPQ</th>
                <th className="num">Quotable $</th>
                <th className="num">Avg Quote</th>
                <th className="num">Jobs</th>
                <th className="num th-target">Close %</th>
                <th className="num th-target">Cost/Job</th>
                <th className="num">Revenue</th>
                <th className="num th-target">ROAS</th>
                <th className="num">$/Lead</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(d => {
                const cplCls = d.adspend > 0 ? thresholdClass(d.cpl, TH.cpl, 'below') : '';
                const lqCls = d.leads > 0 ? thresholdClass(d.leadToQuote, TH.leadToQuote, 'above') : '';
                const cpqCls = d.adspend > 0 && d.qualifiedQuotes > 0 ? thresholdClass(d.cpq, TH.cpq, 'below') : '';
                const crCls = d.qualifiedQuotes > 0 ? thresholdClass(d.closeRate, TH.closeRate, 'above') : '';
                const cpjCls = d.adspend > 0 && d.jobsClosed > 0 ? thresholdClass(d.cpj, TH.cpj, 'below') : '';
                const roasCls = d.adspend > 0 ? thresholdClass(d.roas, TH.roas, 'above') : '';
                const badCount = [cplCls, lqCls, cpqCls, crCls, cpjCls, roasCls].filter(c => c === 'cell-bad').length;
                const dt = new Date(d.date + 'T00:00:00Z');
                return (
                  <tr key={d.date} className={badCount >= 3 ? 'row-bad' : ''}>
                    <td style={{ position: 'sticky', left: 0, background: 'inherit', zIndex: 1, fontWeight: 600 }}>
                      {dt.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
                      <div className="tiny muted">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getUTCDay()]}
                      </div>
                    </td>
                    <td className="num">{d.adspend > 0 ? '$' + d.adspend.toLocaleString('en-NZ', { maximumFractionDigits: 0 }) : '—'}</td>
                    <td className="num">{d.leads}</td>
                    <td className={`num ${cplCls}`}>{d.adspend > 0 ? '$' + d.cpl.toFixed(2) : '—'}</td>
                    <td className="num">{d.qualifiedQuotes}</td>
                    <td className={`num ${lqCls}`}>{d.leads > 0 ? fmt(d.leadToQuote, { pct: true, decimals: 0 }) : '—'}</td>
                    <td className={`num ${cpqCls}`}>{d.adspend > 0 && d.qualifiedQuotes > 0 ? '$' + d.cpq.toFixed(2) : '—'}</td>
                    <td className="num">{d.quotableValue > 0 ? '$' + d.quotableValue.toLocaleString('en-NZ', { maximumFractionDigits: 0 }) : '—'}</td>
                    <td className="num">{d.qualifiedQuotes > 0 ? '$' + d.avgQuoteValue.toFixed(0) : '—'}</td>
                    <td className="num">{d.jobsClosed}</td>
                    <td className={`num ${crCls}`}>{d.qualifiedQuotes > 0 ? fmt(d.closeRate, { pct: true, decimals: 0 }) : '—'}</td>
                    <td className={`num ${cpjCls}`}>{d.adspend > 0 && d.jobsClosed > 0 ? '$' + d.cpj.toFixed(2) : '—'}</td>
                    <td className="num">{d.contractedRevenue > 0 ? '$' + d.contractedRevenue.toLocaleString('en-NZ', { maximumFractionDigits: 0 }) : '—'}</td>
                    <td className={`num ${roasCls}`}>{d.adspend > 0 ? d.roas.toFixed(2) + 'x' : '—'}</td>
                    <td className="num muted">{d.leads > 0 ? '$' + d.revPerLead.toFixed(0) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
