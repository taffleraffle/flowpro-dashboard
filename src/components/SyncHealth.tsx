import type { SyncRunRow } from '@/lib/metrics';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SOURCE_LABEL: Record<string, string> = {
  simpro: 'SimPro',
  whatconverts: 'WhatConverts',
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  geocode: 'Geocode',
};

export function SyncHealth({ runs }: { runs: SyncRunRow[] }) {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <h3 className="card-title">Data sync health</h3>
          <div className="card-sub">Background syncs run every 30 min. Failures surface here, not silently.</div>
        </div>
      </div>
      <div className="card-b">
        <table className="flow">
          <thead>
            <tr>
              <th>Source</th>
              <th>Status</th>
              <th>Last run</th>
              <th className="num">Rows</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                  No syncs yet — trigger one with <code>POST /api/sync/simpro</code>.
                </td>
              </tr>
            ) : (
              runs.map(r => (
                <tr key={r.id}>
                  <td><strong>{SOURCE_LABEL[r.source] ?? r.source}</strong></td>
                  <td>
                    <span className={`badge ${r.status === 'ok' ? 'green' : r.status === 'error' ? 'red' : 'amber'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="muted">{timeAgo(r.started_at)}</td>
                  <td className="num">{r.rows_upserted ?? 0}</td>
                  <td className="muted tiny" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.error_message ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
