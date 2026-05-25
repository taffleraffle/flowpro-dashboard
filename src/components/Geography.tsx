import type { GeographyStats } from '@/lib/metrics';
import { fmtNumber, fmtPct } from '@/lib/metrics';

export function GeographyCard({ stats }: { stats: GeographyStats }) {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <h3 className="card-title">Job geography</h3>
          <div className="card-sub">Distance from FlowPro HQ · Silverdale, Auckland</div>
        </div>
      </div>
      <div className="card-b">
        <div className="row cols-2" style={{ marginBottom: 16 }}>
          <div>
            <div className="eyebrow">Avg distance</div>
            <div className="display num" style={{ fontSize: 36 }}>
              {stats.avgDistanceKm != null ? stats.avgDistanceKm.toFixed(1) : '—'}
              <span style={{ fontSize: 16, color: 'var(--muted)', marginLeft: 4 }}>km</span>
            </div>
          </div>
          <div>
            <div className="eyebrow">Jobs geocoded</div>
            <div className="display num" style={{ fontSize: 36 }}>
              {fmtNumber(stats.geocoded)}<span style={{ fontSize: 16, color: 'var(--muted)', marginLeft: 4 }}>/ {fmtNumber(stats.total)}</span>
            </div>
          </div>
        </div>
        <table className="flow">
          <thead>
            <tr>
              <th>Within</th>
              <th className="num">Jobs</th>
              <th>Share</th>
              <th className="num">%</th>
            </tr>
          </thead>
          <tbody>
            {stats.withinKm.map(b => (
              <tr key={b.km}>
                <td><strong>{b.km} km</strong></td>
                <td className="num">{fmtNumber(b.count)}</td>
                <td style={{ width: '50%' }}>
                  <div className="bar-track">
                    <div className="bar-fill navy" style={{ width: `${b.pct * 100}%` }} />
                  </div>
                </td>
                <td className="num">{fmtPct(b.pct, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {stats.total > 0 && stats.geocoded === 0 ? (
          <div className="muted tiny" style={{ marginTop: 12 }}>
            Jobs are synced but not yet geocoded — distances appear once the geocode pass runs.
          </div>
        ) : null}
      </div>
    </div>
  );
}
