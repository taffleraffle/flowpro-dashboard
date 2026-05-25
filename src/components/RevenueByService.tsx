import { Donut } from './charts/Donut';
import { fmt } from '@/lib/format';
import type { ServiceCategoryRow } from '@/lib/metrics';

export function RevenueByService({ rows }: { rows: ServiceCategoryRow[] }) {
  const totalRev = rows.reduce((s, c) => s + c.revenue, 0);
  const totalJobs = rows.reduce((s, c) => s + c.jobs, 0);
  const top = rows[0];

  if (!rows.length) {
    return (
      <div className="card">
        <div className="card-h">
          <div>
            <div className="eyebrow">Primary job value</div>
            <h3 className="card-title">Revenue by Service</h3>
            <div className="card-sub">No completed jobs in window</div>
          </div>
          <span className="badge amber">No SimPro data</span>
        </div>
        <div className="card-b muted" style={{ padding: '36px 8px', textAlign: 'center' }}>
          Lights up once SimPro sync runs (currently blocked by 503).
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Primary job value</div>
          <h3 className="card-title">Revenue by Service</h3>
          <div className="card-sub">
            {fmt(totalJobs)} jobs · {fmt(totalRev, { currency: true, compact: true })}
          </div>
        </div>
        {top && <span className="badge cyan">Top: {top.category}</span>}
      </div>
      <div
        className="card-b"
        style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20, alignItems: 'center' }}
      >
        <Donut
          data={rows.map(r => ({ label: r.category, value: r.revenue, color: r.color }))}
          centerLabel="Top svc."
          centerValue={top ? fmt(top.revenue / 1000, { decimals: 0 }) + 'k' : '—'}
        />
        <div className="stack-v" style={{ gap: 10 }}>
          {rows.map(c => (
            <div key={c.category}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <div className="stack-h" style={{ minWidth: 0 }}>
                  <span
                    style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{c.category}</span>
                  <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>
                    {c.jobs} jobs · ${Math.round(c.avgTicket)} avg
                  </span>
                </div>
                <div className="stack-h" style={{ gap: 10, flexShrink: 0 }}>
                  <span className="num" style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {fmt(c.revenue, { currency: true, compact: true })}
                  </span>
                  <span className="tiny muted num" style={{ width: 36, textAlign: 'right' }}>
                    {fmt(c.revenue / totalRev, { pct: true, decimals: 0 })}
                  </span>
                </div>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(c.revenue / totalRev) * 100}%`, background: c.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
