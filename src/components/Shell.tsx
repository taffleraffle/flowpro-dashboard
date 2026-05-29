'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FlowproLogo } from './Logo';
import { Icon } from './Icons';
import { PERIODS, parsePeriod, type Period } from '@/lib/periods';

const TABS = [
  { label: 'Overview',   href: '/' },
  { label: 'Bookings',   href: '/bookings' },
  { label: 'Sales',      href: '/sales' },
  { label: 'Marketing',  href: '/marketing' },
  { label: 'Operations', href: '/operations' },
  { label: 'Jobs',       href: '/jobs' },
  { label: 'Customers',  href: '/customers' },
];

// ============================================================
// Build a `?...` query string preserving existing params while
// overriding/clearing specific keys. Used by every filter control.
// ============================================================
function buildHref(
  pathname: string,
  sp: URLSearchParams,
  overrides: Record<string, string | null>,
): string {
  const next = new URLSearchParams(sp.toString());
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null || v === '') next.delete(k);
    else next.set(k, v);
  }
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

// ============================================================
// TopBar
// ============================================================
export function TopBar({ syncErrors = 0 }: { syncErrors?: number }) {
  const pathname = usePathname();
  return (
    <div className="topbar">
      <FlowproLogo />
      <nav>
        {TABS.map(t => {
          const active = t.href === '/' ? pathname === '/' : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={active ? 'active' : ''}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="spacer" />
      <SearchBox />
      <NotificationsButton count={syncErrors} />
      <SettingsButton />
      <div className="user">
        <div className="av">PF</div>
        <div className="stack-v" style={{ gap: 0, marginRight: 8 }}>
          <div className="name">Pete Findlay</div>
          <div className="role">Owner</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SubBar — title + breadcrumb + filter controls
// All filter controls use Links / native form submission so they
// work without JS hydration. URL state is the source of truth.
// ============================================================
export function SubBar({
  title,
  crumb,
  showFilters = true,
}: {
  title: string;
  crumb: string;
  showFilters?: boolean;
}) {
  return (
    <div className="subbar">
      <div>
        <div className="crumb">{crumb}</div>
        <h1>{title}</h1>
      </div>
      <div className="spacer" />
      {showFilters && (
        <>
          <PeriodTabs />
          <DateRangePicker />
          <SourceFilter />
        </>
      )}
    </div>
  );
}

// ============================================================
// Period tabs — 4 Link buttons, no JS required to navigate
// ============================================================
function PeriodTabs() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const params = new URLSearchParams(sp.toString());
  const customActive = !!params.get('from') && !!params.get('to');
  const active = customActive ? null : parsePeriod(params.get('period'));
  return (
    <div className="period-tabs">
      {PERIODS.map(p => (
        <Link
          key={p}
          href={buildHref(pathname, params, { period: p, from: null, to: null })}
          className={active === p ? 'active' : ''}
          // replace avoids cluttering browser history with every period click
          replace
          scroll={false}
        >
          {p}
        </Link>
      ))}
    </div>
  );
}

// ============================================================
// Date range picker — <details>-based popover with native date inputs.
// Works without JS: open/close handled by <details>, submission via form.
// ============================================================
function DateRangePicker() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const from = sp.get('from') ?? '';
  const to = sp.get('to') ?? '';
  const today = new Date().toISOString().slice(0, 10);
  const label = from && to
    ? `${formatPill(from)} → ${formatPill(to)}`
    : new Date().toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
  const clearHref = buildHref(pathname, new URLSearchParams(sp.toString()), { from: null, to: null });
  return (
    <details className="dropdown">
      <summary className="btn">
        <Icon name="calendar" size={13} />
        {label}
      </summary>
      <div className="popover" style={{ right: 0, top: 'calc(100% + 6px)', minWidth: 280 }}>
        <div className="eyebrow" style={{ padding: '4px 6px 8px' }}>Custom range</div>
        <form action={pathname} method="get" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 6px 6px' }}>
          {/* Preserve period only if no from/to is being set; from/to overrides period */}
          <label className="tiny muted">From
            <input
              type="date"
              name="from"
              defaultValue={from}
              max={today}
              required
              style={dateInputStyle}
            />
          </label>
          <label className="tiny muted">To
            <input
              type="date"
              name="to"
              defaultValue={to}
              max={today}
              required
              style={dateInputStyle}
            />
          </label>
          <div className="stack-h" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <Link href={clearHref} className="btn">Clear</Link>
            <button type="submit" className="btn btn-primary">Apply</button>
          </div>
        </form>
      </div>
    </details>
  );
}

const dateInputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '6px 8px', borderRadius: 6,
  border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: 13, marginTop: 4,
};

function formatPill(iso: string) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// ============================================================
// Source filter — <details>-based, each option is a Link
// ============================================================
const SOURCE_OPTIONS: Array<{ label: string; value: string | null }> = [
  { label: 'All sources',              value: null },
  { label: 'Google Ads',               value: 'Google Ads' },
  { label: 'Google Organic',           value: 'Google Organic' },
  { label: 'Google Business Profile',  value: 'Google Business Profile' },
  { label: 'Bing Ads',                 value: 'Bing Ads' },
  { label: 'Bing Organic',             value: 'Bing Organic' },
  { label: 'Meta Ads',                 value: 'Meta Ads' },
  { label: 'Facebook',                 value: 'Facebook' },
  { label: 'Referral',                 value: 'Referral' },
  { label: 'Direct',                   value: 'Direct' },
  { label: 'AI Search',                value: 'AI Search' },
  { label: 'Other',                    value: 'Other' },
];

function SourceFilter() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const params = new URLSearchParams(sp.toString());
  const current = sp.get('source');
  const currentLabel = current ?? 'All sources';
  return (
    <details className="dropdown">
      <summary className="btn">
        <Icon name="filter" size={13} />
        {currentLabel}
      </summary>
      <div className="popover" style={{ right: 0, top: 'calc(100% + 6px)', maxHeight: 320, overflowY: 'auto' }}>
        {SOURCE_OPTIONS.map(opt => (
          <Link
            key={opt.label}
            href={buildHref(pathname, params, { source: opt.value })}
            className={`popover-item ${currentLabel === opt.label ? 'active' : ''}`}
            replace
            scroll={false}
          >
            {opt.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

// ============================================================
// Search box — live cross-table search (requires JS)
// ============================================================
function SearchBox() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; label: string; sub: string; href: string }[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
          setOpen(true);
        }
      } catch { /* network errors → empty results */ }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Search leads, customers, jobs…"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          color: 'var(--ink)',
          borderRadius: 8,
          padding: '8px 12px 8px 32px',
          width: 260,
          fontSize: 12,
          outline: 'none',
        }}
      />
      <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}>
        <Icon name="search" size={13} />
      </div>
      {open && results.length > 0 && (
        <div className="popover" style={{ right: 0, top: 'calc(100% + 6px)', minWidth: 360, maxHeight: 420, overflowY: 'auto' }}>
          {results.map(r => (
            <Link key={r.id} href={r.href} className="popover-item" onClick={() => { setOpen(false); setQ(''); }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
              <div className="tiny muted">{r.sub}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Notifications bell (kept as client — needs fetch)
// ============================================================
type BellBooking = { id: string; ref: string; name: string; service: string | null; status: string; created_at: string };

function NotificationsButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Array<{ id: number; source: string; error_message: string | null; started_at: string }>>([]);
  const [bookings, setBookings] = useState<BellBooking[]>([]);
  const [unseen, setUnseen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Poll booking count for the badge (mount + every 60s) so new bookings
  // surface without a page reload.
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/bookings')
        .then(r => r.json())
        .then(d => { if (alive) { setUnseen(d.unseen ?? 0); setBookings(d.items ?? []); } })
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!open) return;
    fetch('/api/notifications').then(r => r.json()).then(d => setItems(d.items ?? []));
    fetch('/api/bookings').then(r => r.json()).then(d => { setUnseen(d.unseen ?? 0); setBookings(d.items ?? []); }).catch(() => {});
  }, [open]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const badge = count + unseen;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`${badge} notifications`}
        style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--surface-2)', color: 'var(--ink)',
          border: '1px solid var(--border)',
          display: 'grid', placeItems: 'center', position: 'relative', cursor: 'pointer',
        }}
      >
        <Icon name="bell" size={15} />
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: unseen > 0 ? 'var(--cyan-600)' : 'var(--danger)', color: '#fff',
            borderRadius: '50%', minWidth: 18, height: 18,
            fontSize: 10, fontWeight: 700,
            display: 'grid', placeItems: 'center', padding: '0 4px',
            border: '2px solid var(--surface)',
          }}>{badge}</span>
        )}
      </button>
      {open && (
        <div className="popover" style={{ right: 0, top: 'calc(100% + 6px)', minWidth: 360, maxHeight: 460, overflowY: 'auto', color: 'var(--ink)' }}>
          <div className="eyebrow" style={{ padding: '4px 6px 8px' }}>New bookings</div>
          {bookings.length === 0 ? (
            <div className="muted tiny" style={{ padding: '6px 8px 10px', textAlign: 'center' }}>No bookings yet.</div>
          ) : bookings.slice(0, 6).map(bk => (
            <Link key={bk.id} href="/bookings" className="popover-item" onClick={() => setOpen(false)}>
              <div className="stack-h" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{bk.name}</span>
                <span className={`badge ${bk.status === 'sent_to_simpro' ? 'green' : bk.status === 'error' ? 'red' : 'amber'}`}>{bk.ref}</span>
              </div>
              <div className="tiny muted">{(bk.service ?? 'Booking')} · {new Date(bk.created_at).toLocaleString('en-NZ')}</div>
            </Link>
          ))}
          <div className="eyebrow" style={{ padding: '12px 6px 8px', borderTop: '1px solid var(--divider)' }}>Recent sync activity</div>
          {items.length === 0 ? (
            <div className="muted tiny" style={{ padding: 12, textAlign: 'center' }}>No recent activity.</div>
          ) : items.map(it => (
            <div key={it.id} style={{ padding: '8px 8px', borderTop: '1px solid var(--divider)' }}>
              <div className="stack-h">
                <span className={`badge ${it.error_message ? 'red' : 'green'}`}>{it.source}</span>
                <span className="tiny muted">{new Date(it.started_at).toLocaleString('en-NZ')}</span>
              </div>
              {it.error_message && (
                <div className="tiny" style={{ marginTop: 4, color: 'var(--danger)' }}>
                  {it.error_message.slice(0, 200)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Settings drawer (kept as client — needs sync triggers)
// ============================================================
function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Settings"
        style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--surface-2)', color: 'var(--ink)',
          border: '1px solid var(--border)',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
        }}
      >
        <Icon name="settings" size={15} />
      </button>
      {open && <SettingsDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [runs, setRuns] = useState<Array<{ source: string; status: string; started_at: string; rows_upserted: number | null; error_message: string | null }>>([]);

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => setRuns(d.items ?? []));
  }, [busy]);

  async function trigger(source: 'simpro' | 'whatconverts') {
    setBusy(source);
    setMsg(null);
    try {
      const r = await fetch(`/api/sync/${source}`, {
        method: 'POST',
        headers: { Authorization: `Bearer dev` },
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setMsg({ kind: 'ok', text: `${source} synced — ${data?.data?.rowsUpserted ?? 0} rows` });
        // Force a reload to re-fetch RSC payload with fresh data
        if (typeof window !== 'undefined') window.location.reload();
      } else {
        setMsg({ kind: 'err', text: data?.error ?? `${source} sync failed (${r.status})` });
      }
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'sync failed' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,37,64,.4)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 420, height: '100vh', background: 'var(--surface)', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(10,37,64,.2)', color: 'var(--ink)' }}
      >
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
          <div className="stack-h" style={{ justifyContent: 'space-between' }}>
            <h2 className="display" style={{ margin: 0, fontSize: 22 }}>Settings</h2>
            <button type="button" onClick={onClose} style={{ background: 'var(--bg)', color: 'var(--ink)', width: 32, height: 32, borderRadius: 8, border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <Icon name="x" size={14} />
            </button>
          </div>
          <div className="card-sub" style={{ marginTop: 4 }}>Sync controls + data source status</div>
        </div>

        <div style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Trigger sync</div>
          <div className="stack-v" style={{ gap: 8, marginBottom: 20 }}>
            <button type="button" className="btn btn-primary" disabled={busy != null} onClick={() => trigger('whatconverts')} style={{ justifyContent: 'space-between', width: '100%' }}>
              <span>WhatConverts</span>
              <span className="tiny">{busy === 'whatconverts' ? 'syncing…' : 'sync now'}</span>
            </button>
            <button type="button" className="btn" disabled={busy != null} onClick={() => trigger('simpro')} style={{ justifyContent: 'space-between', width: '100%' }}>
              <span>SimPro</span>
              <span className="tiny">{busy === 'simpro' ? 'syncing…' : 'sync now'}</span>
            </button>
          </div>

          {msg && (
            <div className={msg.kind === 'ok' ? 'badge green' : 'badge red'} style={{ padding: 10, width: '100%', display: 'block', marginBottom: 16, fontSize: 12 }}>
              {msg.text}
            </div>
          )}

          <div className="eyebrow" style={{ marginBottom: 10 }}>Recent runs</div>
          <div className="stack-v" style={{ gap: 8 }}>
            {runs.slice(0, 8).map((r, i) => (
              <div key={i} style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="stack-h" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.source}</span>
                  <span className={`badge ${r.status === 'ok' ? 'green' : r.status === 'error' ? 'red' : 'amber'}`}>{r.status}</span>
                </div>
                <div className="tiny muted" style={{ marginTop: 2 }}>
                  {new Date(r.started_at).toLocaleString('en-NZ')} · {r.rows_upserted ?? 0} rows
                </div>
                {r.error_message && (
                  <div className="tiny" style={{ marginTop: 4, color: 'var(--danger)' }}>
                    {r.error_message.slice(0, 180)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Page footer
// ============================================================
export function PageFooter({ lastSync }: { lastSync?: string | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 4px 32px', color: 'var(--muted)', fontSize: 12 }}>
      <div className="stack-h">
        <svg width="18" height="18" viewBox="0 0 60 60" fill="none" aria-hidden>
          <path d="M30 6 C 18 22, 10 32, 10 40 a 20 20 0 0 0 40 0 c 0 -8 -8 -18 -20 -34 Z" fill="#1BA8D4" />
        </svg>
        <span>FlowPro Plumbers &amp; Gasfitters · Silverdale, Auckland</span>
      </div>
      <div>Last sync · {lastSync ?? 'never'}</div>
    </div>
  );
}

// Back-compat re-exports
export type { Period } from '@/lib/periods';
export { periodToWindow, parsePeriod } from '@/lib/periods';
