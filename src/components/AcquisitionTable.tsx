// "Where jobs come from" — the source attribution table from the reference.

import type { AcquisitionRow } from '@/lib/metrics';
import { fmt } from '@/lib/format';

// ROAS cell logic:
// - Paid channel with spend > 0 → numeric badge (green ≥5x, cyan ≥3x, amber otherwise)
// - Paid channel with no spend synced yet → amber "no data" (NOT misleading ∞)
// - Unpaid channel (organic/direct/referral) with revenue → green ∞
// - Unpaid channel with $0 revenue or any source with no leads → muted dash
function roasCell(r: AcquisitionRow) {
  if (r.roas != null) {
    const cls = r.roas >= 5 ? 'green' : r.roas >= 3 ? 'cyan' : 'amber';
    return <span className={`badge ${cls}`}>{r.roas.toFixed(1)}x</span>;
  }
  if (r.isPaid) {
    return <span className="badge amber" title="Ad spend not synced yet">no data</span>;
  }
  if (r.revenue > 0) {
    return <span className="badge green" title="Unpaid channel — infinite ROAS by definition">∞</span>;
  }
  return <span className="muted">—</span>;
}

export function AcquisitionTable({ rows }: { rows: AcquisitionRow[] }) {
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Acquisition</div>
          <h3 className="card-title">Where jobs come from</h3>
          <div className="card-sub">
            {fmt(totalLeads)} leads · {fmt(totalRev, { currency: true, compact: true })} attributed
          </div>
        </div>
        <span className="badge cyan">By Revenue</span>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="muted" style={{ padding: '36px 20px', textAlign: 'center' }}>
            No leads in this window yet.
          </div>
        ) : (
          <table className="flow">
            <thead>
              <tr>
                <th>Source</th>
                <th className="num">Leads</th>
                <th className="num">Won</th>
                <th>Conv.</th>
                <th className="num">Revenue</th>
                <th className="num">Spend</th>
                <th className="num">ROAS</th>
                <th className="num">CPA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.source}>
                  <td>
                    <div className="stack-h">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: r.color,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>{r.source}</span>
                    </div>
                  </td>
                  <td className="num">{fmt(r.leads)}</td>
                  <td className="num">{fmt(r.won)}</td>
                  <td>
                    <div className="stack-h" style={{ minWidth: 110 }}>
                      <div className="bar-track" style={{ width: 70 }}>
                        <div
                          className="bar-fill"
                          style={{ width: `${r.conv * 100}%`, background: r.color }}
                        />
                      </div>
                      <span className="num tiny" style={{ minWidth: 32 }}>
                        {fmt(r.conv, { pct: true, decimals: 0 })}
                      </span>
                    </div>
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {fmt(r.revenue, { currency: true, compact: true })}
                  </td>
                  <td className="num muted">
                    {r.spend != null ? fmt(r.spend, { currency: true }) : '—'}
                  </td>
                  <td className="num">{roasCell(r)}</td>
                  <td className="num muted">
                    {r.cpa != null ? fmt(r.cpa, { currency: true, decimals: 0 }) : '—'}
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
