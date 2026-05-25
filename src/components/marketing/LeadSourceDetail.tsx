import { fmt } from '@/lib/format';
import { Icon } from '../Icons';
import { TH, thresholdClass, type ChannelGroup } from '@/lib/marketing-metrics';

// Collapsible channel groups (Paid / Organic / Word of Mouth) with a clean
// inner table per group. Uses native <details> so it works without JS — the
// disclosure arrow indicates expand/collapse state and the browser remembers
// it across navigation as long as the URL doesn't change.
export function LeadSourceDetail({ groups }: { groups: ChannelGroup[] }) {
  const grandLeads = groups.reduce((s, g) => s + g.totals.leads, 0);
  const grandRev = groups.reduce((s, g) => s + g.totals.revenue, 0);

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Acquisition mix</span>
          <h3 className="card-title">Where Leads Come From</h3>
          <div className="card-sub">
            {fmt(grandLeads)} leads · {fmt(grandRev, { currency: true, compact: true })} attributed ·
            click a channel to expand
          </div>
        </div>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        {groups.map((g, i) => (
          <ChannelDetails key={g.key} g={g} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}

function ChannelDetails({ g, defaultOpen }: { g: ChannelGroup; defaultOpen: boolean }) {
  const isPaid = g.key === 'paid';
  const wonTotal = g.totals.won;

  return (
    <details open={defaultOpen} style={{ borderTop: '1px solid var(--border)' }}>
      <summary
        style={{
          listStyle: 'none',
          cursor: 'pointer',
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'auto 240px 1fr 200px',
          gap: 18,
          alignItems: 'center',
          background: 'var(--surface)',
          transition: 'background .15s',
        }}
      >
        {/* Disclosure triangle */}
        <div
          aria-hidden
          style={{
            width: 18, height: 18, color: 'var(--muted)',
            display: 'grid', placeItems: 'center',
            transition: 'transform .2s',
          }}
          className="chevron"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2 1 L8 5 L2 9 Z" />
          </svg>
        </div>

        {/* Channel identity */}
        <div className="stack-h">
          <div
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: g.tint + '18', color: g.tint,
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}
          >
            <Icon name={g.icon} size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{g.label}</div>
            <div className="tiny muted">
              {g.sources.length} source{g.sources.length === 1 ? '' : 's'} ·{' '}
              {fmt(g.shareLeads, { pct: true, decimals: 0 })} of total
            </div>
          </div>
        </div>

        {/* Inline summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
          <SummaryStat label="Leads" value={fmt(g.totals.leads)} />
          <SummaryStat label="Won" value={fmt(wonTotal)} />
          <SummaryStat
            label="CPL"
            value={g.cpl > 0 ? fmt(g.cpl, { currency: true, decimals: 2 }) : (isPaid ? '—' : 'FREE')}
            tone={
              g.cpl > 0 ? thresholdClass(g.cpl, TH.cpl, 'below') :
              isPaid ? 'muted' : 'good'
            }
          />
          <SummaryStat
            label="ROAS"
            value={
              g.roas != null ? g.roas.toFixed(1) + 'x' :
              isPaid ? '—' :
              g.totals.revenue > 0 ? '∞' : '—'
            }
            tone={
              g.roas != null ? (g.roas >= TH.roas ? 'good' : 'warn') :
              isPaid ? 'muted' :
              g.totals.revenue > 0 ? 'good' : 'muted'
            }
          />
        </div>

        {/* Revenue bar — share of total revenue */}
        <div>
          <div className="tiny muted" style={{ textAlign: 'right', marginBottom: 6 }}>
            {fmt(g.totals.revenue, { currency: true, compact: true })} revenue
          </div>
          <div className="bar-track" style={{ height: 6 }}>
            <div className="bar-fill" style={{ width: `${g.shareLeads * 100}%`, background: g.tint }} />
          </div>
        </div>
      </summary>

      {/* Sub-source rows */}
      {g.sources.length > 0 ? (
        <table className="flow" style={{ borderTop: '1px solid var(--divider)' }}>
          <thead style={{ background: 'var(--surface-2)' }}>
            <tr>
              <th style={{ paddingLeft: 60 }}>Source</th>
              <th className="num">Leads</th>
              <th className="num">Spend</th>
              <th className="num">CPL</th>
              <th className="num">Won</th>
              <th className="num">Revenue</th>
              <th className="num">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {g.sources.map(s => {
              const cpl = s.spend && s.spend > 0 ? s.spend / s.leads : null;
              return (
                <tr key={s.source}>
                  <td style={{ paddingLeft: 60 }}>
                    <div className="stack-h">
                      <span
                        style={{
                          width: 10, height: 10, borderRadius: 3,
                          background: s.color, display: 'inline-block', flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{s.source}</span>
                    </div>
                  </td>
                  <td className="num">{s.leads}</td>
                  <td className="num muted">{s.spend && s.spend > 0 ? '$' + s.spend.toLocaleString() : '—'}</td>
                  <td className={`num ${cpl != null ? thresholdClass(cpl, TH.cpl, 'below') : ''}`}>
                    {cpl != null ? '$' + cpl.toFixed(2) :
                     s.isPaid ? <span className="muted">no data</span> :
                     <span style={{ color: 'var(--success)', fontWeight: 700 }}>FREE</span>}
                  </td>
                  <td className="num">{s.won}</td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {s.revenue > 0 ? '$' + (s.revenue / 1000).toFixed(1) + 'k' : '—'}
                  </td>
                  <td className="num">
                    {s.roas != null ? (
                      <span className={`badge ${s.roas >= TH.roas ? 'green' : s.roas >= TH.roas * 0.6 ? 'amber' : 'red'}`}>
                        {s.roas.toFixed(1)}x
                      </span>
                    ) : s.isPaid ? (
                      <span className="badge amber">no data</span>
                    ) : s.revenue > 0 ? (
                      <span className="badge green">∞</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="muted tiny" style={{ padding: '14px 60px' }}>
          No leads in this channel for the selected window.
        </div>
      )}
    </details>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: '' | 'good' | 'warn' | 'bad' | 'muted' | 'cell-good' | 'cell-warn' | 'cell-bad';
}) {
  const colorMap: Record<string, string> = {
    'good': 'var(--success)',
    'cell-good': 'var(--success)',
    'warn': '#B47A1F',
    'cell-warn': '#B47A1F',
    'bad': 'var(--danger)',
    'cell-bad': 'var(--danger)',
    'muted': 'var(--muted)',
  };
  return (
    <div>
      <div className="tiny muted" style={{ letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 9, fontWeight: 600 }}>
        {label}
      </div>
      <div
        className="num display"
        style={{ fontSize: 18, color: tone ? (colorMap[tone] ?? 'var(--ink)') : 'var(--ink)', lineHeight: 1.2 }}
      >
        {value}
      </div>
    </div>
  );
}
