import { TopBar } from './Shell';
import type { ConfigCheckGroup } from '@/lib/config-check';

export function SetupScreen({ groups }: { groups: ConfigCheckGroup[] }) {
  const totalRequired = groups.filter(g => g.required).reduce((a, g) => a + g.vars.length, 0);
  const presentRequired = groups
    .filter(g => g.required)
    .reduce((a, g) => a + g.vars.filter(v => v.present).length, 0);

  return (
    <>
      <TopBar />
      <div className="subbar">
        <div>
          <div className="crumb">Setup · First-run</div>
          <h1>Connect data sources</h1>
        </div>
        <div className="spacer" />
        <span className="badge amber">{presentRequired} / {totalRequired} required vars set</span>
      </div>
      <div className="page">
        <div className="card">
          <div className="card-h">
            <div>
              <h3 className="card-title">Welcome to FlowPro Dashboard</h3>
              <div className="card-sub">
                Paste the missing values into <code>.env.local</code>, restart the dev server, and the dashboard lights up.
              </div>
            </div>
          </div>
          <div className="card-b">
            <p className="muted" style={{ marginBottom: 16 }}>
              The dashboard reads from a Supabase cache that&apos;s populated every 30 minutes by background syncs. To boot at all, you need Supabase credentials. SimPro and WhatConverts are needed for real data. Google + Meta Ads are stubbed.
            </p>

            {groups.map(g => (
              <div key={g.label} style={{ marginTop: 20 }}>
                <div className="stack-h" style={{ marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16 }}>{g.label}</h4>
                  {g.required ? <span className="badge red">required</span> : <span className="badge">optional</span>}
                </div>
                <table className="flow">
                  <thead>
                    <tr>
                      <th>Variable</th>
                      <th>Status</th>
                      <th>Where to get it</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.vars.map(v => (
                      <tr key={v.name}>
                        <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v.name}</code></td>
                        <td>
                          {v.present ? (
                            <span className="badge green">set</span>
                          ) : (
                            <span className="badge amber">missing</span>
                          )}
                        </td>
                        <td className="muted tiny">{v.hint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <div className="muted tiny" style={{ marginTop: 24, padding: 16, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <strong style={{ color: 'var(--ink)' }}>Quick start:</strong>
              <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                <li>Open <code>c:\Users\Ben\projects\flowpro-dashboard\.env.local</code></li>
                <li>Paste the missing values (see README for sources)</li>
                <li>In the Supabase SQL editor, run <code>supabase/migrations/001_init.sql</code></li>
                <li>Restart this dev server (<code>Ctrl+C</code>, then <code>npm run dev</code>)</li>
                <li>Trigger first sync: <code>npm run sync:simpro</code> &amp; <code>npm run sync:whatconverts</code></li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
