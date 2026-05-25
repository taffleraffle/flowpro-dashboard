// "Jobs sourced from marketing" — the answer to "where do our jobs actually
// come from?". Each row is a real SimPro job traced back to a WhatConverts
// lead via the phone/email bridge.

import { fmt } from '@/lib/format';
import type { AttributionSummary } from '@/lib/metrics';

export function JobAttribution({ summary }: { summary: AttributionSummary }) {
  const { rows } = summary;
  if (rows.length === 0) {
    return (
      <div className="card">
        <div className="card-h">
          <div>
            <div className="eyebrow">Attribution</div>
            <h3 className="card-title">Jobs sourced from marketing</h3>
            <div className="card-sub">No matched jobs in this window</div>
          </div>
        </div>
        <div className="card-b muted tiny" style={{ padding: 40, textAlign: 'center' }}>
          No completed jobs in this window matched a tracked WhatConverts lead.
          Either no jobs settled yet, or the phone/email on the lead didn&apos;t
          match a SimPro customer.
        </div>
      </div>
    );
  }

  // Channel totals across the visible window
  type ChTotal = { jobs: number; revenue: number; color: string };
  const byChannel = new Map<string, ChTotal>();
  for (const r of rows) {
    const b = byChannel.get(r.channel) ?? { jobs: 0, revenue: 0, color: r.channelColor };
    b.jobs += 1;
    b.revenue += r.jobRevenue;
    byChannel.set(r.channel, b);
  }
  const channels = [...byChannel.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);

  const leadMatchPct = summary.totalLeads > 0
    ? Math.round((summary.matchedLeads / summary.totalLeads) * 100)
    : 0;

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Attribution</div>
          <h3 className="card-title">Jobs sourced from marketing</h3>
          <div className="card-sub">
            {rows.length} matched job{rows.length === 1 ? '' : 's'} ·{' '}
            {fmt(totalRevenue, { currency: true, compact: true })} traced ·{' '}
            <span title="Leads in this window that we could trace to a SimPro customer (via phone or email match)">
              {summary.matchedLeads}/{summary.totalLeads} leads tracked ({leadMatchPct}%)
            </span>
          </div>
        </div>
      </div>

      <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Tracking-coverage summary — the honest "what we can see vs can't" pill */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
            gap: 8,
            padding: 12,
            background: 'var(--surface-2)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          <CoverageStat
            label="Window revenue"
            value={fmt(summary.totalRevenueInWindow, { currency: true, compact: true })}
            sub="all completed jobs"
          />
          <CoverageStat
            label="Attributed to marketing"
            value={fmt(summary.attributedRevenue, { currency: true, compact: true })}
            sub={`${Math.round(summary.attributedShare * 100)}% of total · via bridge`}
            highlight
          />
          <CoverageStat
            label="Untracked"
            value={fmt(summary.untrackedRevenue, { currency: true, compact: true })}
            sub="word-of-mouth, repeats, no caller match"
          />
        </div>

        {/* Channel totals — pill row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {channels.map(c => (
            <div
              key={c.name}
              style={{
                border: `1px solid ${c.color}55`,
                background: `${c.color}10`,
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minWidth: 140,
              }}
            >
              <div
                className="eyebrow"
                style={{ fontSize: 10, color: c.color }}
              >
                {c.name}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {fmt(c.revenue, { currency: true, compact: true })}
              </div>
              <div className="tiny muted">{c.jobs} job{c.jobs === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>

        {/* Job-level table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={th}>Job date</th>
                <th style={th}>Customer</th>
                <th style={th}>Channel</th>
                <th style={th}>Lead source</th>
                <th style={{ ...th, textAlign: 'right' }}>Revenue</th>
                <th style={{ ...th, textAlign: 'right' }}>Days lead→job</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map(r => (
                <tr key={r.jobId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={td}>{r.jobDate ? formatDate(r.jobDate) : '—'}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.customerName}</td>
                  <td style={td}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: `${r.channelColor}18`,
                        color: r.channelColor,
                        fontWeight: 600,
                        fontSize: 11,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: r.channelColor,
                        }}
                      />
                      {r.channel}
                    </span>
                  </td>
                  <td style={{ ...td, color: 'var(--muted)' }}>
                    {[r.leadSource, r.leadMedium].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                    {fmt(r.jobRevenue, { currency: true, compact: true })}
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: 'var(--muted)' }}>
                    {daysBetween(r.leadDate, r.jobDate) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 50 && (
            <div className="tiny muted" style={{ padding: '8px 0', textAlign: 'center' }}>
              Showing 50 of {rows.length} matched jobs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CoverageStat({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        className="eyebrow"
        style={{ fontSize: 10, color: highlight ? 'var(--cyan-700)' : 'var(--muted)' }}
      >
        {label}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 18,
          color: highlight ? 'var(--cyan-700)' : 'var(--text)',
        }}
      >
        {value}
      </div>
      <div className="tiny muted" style={{ fontSize: 10 }}>
        {sub}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '8px 8px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  color: 'var(--muted)',
};
const td: React.CSSProperties = { padding: '8px 8px' };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: '2-digit' });
}
function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.round(ms / 86_400_000);
}
