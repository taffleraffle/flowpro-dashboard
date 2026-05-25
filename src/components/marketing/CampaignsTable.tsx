import { fmt } from '@/lib/format';
import { TH, thresholdClass, type CampaignRow } from '@/lib/marketing-metrics';

export function CampaignsTable({ rows }: { rows: CampaignRow[] }) {
  const statusBadge: Record<CampaignRow['status'], string> = {
    active: 'green',
    paused: 'amber',
    ended: 'red',
  };

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Campaigns</span>
          <h3 className="card-title">Active Campaigns</h3>
          <div className="card-sub">
            {rows.length === 0
              ? 'No ads spend synced yet — connect Google Ads / Meta Ads in Settings'
              : `${rows.length} campaign${rows.length === 1 ? '' : 's'}`}
          </div>
        </div>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 12,
              border: '1px dashed var(--border-2)',
              borderRadius: 8,
              margin: 16,
            }}
          >
            Campaign-level performance activates once Google Ads + Meta Ads sync run.
            Schema is wired and ready in <code>ads_spend_daily</code>.
          </div>
        ) : (
          <table className="flow">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th className="num">Spend</th>
                <th className="num">Leads</th>
                <th className="num">CPL</th>
                <th className="num">Revenue</th>
                <th className="num">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const cpl = c.leads > 0 ? c.spend / c.leads : 0;
                const roas = c.spend > 0 ? c.revenue / c.spend : null;
                return (
                  <tr key={c.name + c.channel}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div className="tiny muted">{c.channel}</div>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge[c.status]}`}>{c.status.toUpperCase()}</span>
                    </td>
                    <td className="num">{c.spend > 0 ? fmt(c.spend, { currency: true }) : '—'}</td>
                    <td className="num">{c.leads}</td>
                    <td className={`num ${cpl > 0 ? thresholdClass(cpl, TH.cpl, 'below') : ''}`}>
                      {cpl > 0 ? fmt(cpl, { currency: true, decimals: 2 }) : 'FREE'}
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {c.revenue > 0 ? '$' + (c.revenue / 1000).toFixed(1) + 'k' : '—'}
                    </td>
                    <td className="num">
                      {roas != null ? (
                        <span className={`badge ${roas >= TH.roas ? 'green' : 'amber'}`}>
                          {roas.toFixed(1)}x
                        </span>
                      ) : (
                        <span className="badge green">∞</span>
                      )}
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
