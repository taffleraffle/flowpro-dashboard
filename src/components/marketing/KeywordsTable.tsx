import { fmt } from '@/lib/format';
import type { KeywordRow } from '@/lib/marketing-metrics';

export function KeywordsTable({ rows }: { rows: KeywordRow[] }) {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Search terms</span>
          <h3 className="card-title">Top Keywords · paid + organic</h3>
          <div className="card-sub">
            {rows.length === 0
              ? 'No keyword data yet — connect Google Ads + Google Search Console'
              : `Top ${rows.length} by clicks`}
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
            Keyword-level performance activates once Google Ads sync runs.
            Schema is wired in <code>keywords_daily</code>.
          </div>
        ) : (
          <table className="flow">
            <thead>
              <tr>
                <th>Keyword</th>
                <th className="num">Impr.</th>
                <th className="num">Clicks</th>
                <th className="num">CTR</th>
                <th className="num">Conv. Rate</th>
                <th className="num">CPC</th>
                <th className="num">Jobs Won</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(k => (
                <tr key={k.term}>
                  <td>
                    <span style={{ fontWeight: 600 }}>&ldquo;{k.term}&rdquo;</span>
                  </td>
                  <td className="num">{fmt(k.impressions, { compact: true })}</td>
                  <td className="num">{k.clicks}</td>
                  <td className="num">
                    <span className="badge cyan">{fmt(k.ctr, { pct: true, decimals: 1 })}</span>
                  </td>
                  <td className="num">{fmt(k.conv, { pct: true, decimals: 1 })}</td>
                  <td className="num muted">${k.cpc.toFixed(2)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{k.jobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
