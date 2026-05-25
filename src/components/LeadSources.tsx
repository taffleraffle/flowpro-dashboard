import type { LeadSourceRow } from '@/lib/metrics';
import { fmtMoney, fmtNumber } from '@/lib/metrics';

export function LeadSources({ rows }: { rows: LeadSourceRow[] }) {
  const max = Math.max(1, ...rows.map(r => r.leads));
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <h3 className="card-title">Lead sources</h3>
          <div className="card-sub">Where leads are coming from · WhatConverts attribution</div>
        </div>
      </div>
      <div className="card-b">
        {rows.length === 0 ? (
          <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
            No leads in this window yet. Once WhatConverts sync runs, sources appear here.
          </div>
        ) : (
          <table className="flow">
            <thead>
              <tr>
                <th>Source</th>
                <th className="num">Leads</th>
                <th>Volume</th>
                <th className="num">Quoted</th>
                <th className="num">Sales</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.source}>
                  <td><strong>{r.source}</strong></td>
                  <td className="num">{fmtNumber(r.leads)}</td>
                  <td style={{ width: '40%' }}>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(r.leads / max) * 100}%` }} />
                    </div>
                  </td>
                  <td className="num muted">{fmtMoney(r.quoted_value)}</td>
                  <td className="num">{fmtMoney(r.sales_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
