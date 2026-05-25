'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { fmt } from '@/lib/format';
import type { SuburbRow } from '@/lib/suburbs';
import { SILVERDALE_DEPOT } from '@/lib/suburbs';

// react-leaflet + leaflet touch `window` at import time, which breaks the
// Next.js SSR build even when this file is wrapped by `dynamic({ ssr: false })`
// (the dynamic flag skips RENDER but not module resolution). The bulletproof
// fix: defer ALL react-leaflet / leaflet imports to runtime via useEffect.
// Until the modules resolve, render a shimmer skeleton.

type AnyComp = ComponentType<Record<string, unknown>>;
type LayersControlT = AnyComp & { BaseLayer: AnyComp };

type LeafletLib = {
  MapContainer: AnyComp;
  TileLayer: AnyComp;
  CircleMarker: AnyComp;
  Marker: AnyComp;
  Popup: AnyComp;
  Tooltip: AnyComp;
  Circle: AnyComp;
  LayersControl: LayersControlT;
  useMap: () => { flyTo: (latlng: [number, number], zoom?: number, options?: { duration?: number }) => void };
  depotIcon: unknown;
};

type SizeBy = 'jobs' | 'revenue';

export function JobMapClient({ suburbs }: { suburbs: SuburbRow[] }) {
  const [sizeBy, setSizeBy] = useState<SizeBy>('jobs');
  const maxValue = useMemo(
    () =>
      Math.max(
        1,
        ...suburbs.map(s => (sizeBy === 'revenue' ? s.revenue : s.jobs)),
      ),
    [suburbs, sizeBy],
  );
  const top = useMemo(
    () =>
      [...suburbs]
        .sort((a, b) => (sizeBy === 'revenue' ? b.revenue - a.revenue : b.jobs - a.jobs))
        .slice(0, 12),
    [suburbs, sizeBy],
  );
  const [lib, setLib] = useState<LeafletLib | null>(null);
  const mapRef = useRef<LeafletLib['useMap'] extends () => infer M ? M : never>(
    null as unknown as ReturnType<LeafletLib['useMap']>,
  );
  const [activeSuburb, setActiveSuburb] = useState<string | null>(null);
  const [showRings, setShowRings] = useState(true);

  // Load all the bits once on mount, then drive the rest with state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rl, leaflet] = await Promise.all([
        import('react-leaflet'),
        import('leaflet'),
      ]);
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-leaflet', '1');
        document.head.appendChild(link);
      }
      // Monochrome + 3D styling. Drives the B&W tile filter, the lifted-circle
      // drop-shadow, and the depot pin glow. The data-jobmap-style version bumps
      // to v3 so cached stylesheets from a previous session get replaced.
      const existing = document.querySelector('style[data-jobmap-style]');
      if (existing && existing.getAttribute('data-jobmap-style') !== 'v3') existing.remove();
      if (!document.querySelector('style[data-jobmap-style="v3"]')) {
        const style = document.createElement('style');
        style.setAttribute('data-jobmap-style', 'v3');
        style.textContent = `
          .jobmap-bw .leaflet-tile-pane {
            filter: grayscale(1) contrast(1.08) brightness(0.96);
          }
          .jobmap-bw .leaflet-overlay-pane path.jm-circle {
            filter: drop-shadow(0 3px 5px rgba(13,53,86,.35));
            transition: filter 180ms ease, stroke-width 180ms ease;
            cursor: pointer;
          }
          .jobmap-bw .leaflet-overlay-pane path.jm-circle:hover {
            filter: drop-shadow(0 5px 10px rgba(27,168,212,.55));
            stroke-width: 2.5;
          }
          .jobmap-bw .leaflet-overlay-pane path.jm-circle-active {
            filter: drop-shadow(0 7px 14px rgba(27,168,212,.7));
          }
          /* Rings are decorative — never block mouse events on circles
             behind them. !important beats Leaflet's inline pointer-events. */
          .jobmap-bw .leaflet-overlay-pane path.jm-ring {
            filter: drop-shadow(0 1px 1px rgba(13,53,86,.18));
            pointer-events: none !important;
          }
          /* Permanent depot label must not swallow hover on nearby circles */
          .jobmap-bw .leaflet-tooltip-pane .leaflet-tooltip {
            pointer-events: none !important;
          }
          .jobmap-vignette {
            position: absolute; inset: 0; pointer-events: none; z-index: 400;
            background:
              radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,.18) 100%),
              linear-gradient(180deg, rgba(255,255,255,.05) 0%, transparent 40%);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,.5),
              inset 0 -20px 40px rgba(0,0,0,.12);
            border-radius: 10px;
          }
        `;
        document.head.appendChild(style);
      }
      const depotIcon = leaflet.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:28px;border-radius:50%;
          background:linear-gradient(155deg,#3FC0E6 0%,#1BA8D4 55%,#0D7AA0 100%);
          border:3px solid #fff;
          box-shadow:
            0 6px 12px rgba(13,53,86,.45),
            0 2px 4px rgba(13,53,86,.35),
            inset 0 1px 0 rgba(255,255,255,.45);
          display:grid;place-items:center;color:#fff;font-size:12px;font-weight:700;
          transform: translateY(-1px);
        ">★</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      if (cancelled) return;
      setLib({
        MapContainer: rl.MapContainer as unknown as AnyComp,
        TileLayer: rl.TileLayer as unknown as AnyComp,
        CircleMarker: rl.CircleMarker as unknown as AnyComp,
        Marker: rl.Marker as unknown as AnyComp,
        Popup: rl.Popup as unknown as AnyComp,
        Tooltip: rl.Tooltip as unknown as AnyComp,
        Circle: rl.Circle as unknown as AnyComp,
        LayersControl: rl.LayersControl as unknown as LayersControlT,
        useMap: rl.useMap as unknown as LeafletLib['useMap'],
        depotIcon,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  if (!lib) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
          gap: 16,
        }}
      >
        <div
          style={{
            minHeight: 520,
            borderRadius: 10,
            background:
              'linear-gradient(90deg, var(--surface-2) 0%, var(--bg) 50%, var(--surface-2) 100%)',
            backgroundSize: '200% 100%',
            animation: 'skeletonShimmer 1.4s ease-in-out infinite',
          }}
        />
        <div className="stack-v">
          <div className="eyebrow" style={{ marginBottom: 8 }}>Top suburbs</div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 44,
                borderRadius: 6,
                background:
                  'linear-gradient(90deg, var(--surface-2) 0%, var(--bg) 50%, var(--surface-2) 100%)',
                backgroundSize: '200% 100%',
                animation: `skeletonShimmer 1.4s ease-in-out ${i * 0.06}s infinite`,
                marginBottom: 6,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, Circle, LayersControl, useMap, depotIcon } = lib;

  // Bridge component to capture map instance via useMap hook
  const MapBridge: ComponentType<{ onReady: (m: ReturnType<LeafletLib['useMap']>) => void; children?: ReactNode }> = ({ onReady }) => {
    const map = useMap();
    useEffect(() => { onReady(map); }, [map, onReady]);
    return null;
  };

  const flyTo = (s: SuburbRow) => {
    setActiveSuburb(s.name);
    mapRef.current?.flyTo([s.lat, s.lng], 14, { duration: 0.8 });
  };

  const mapProps = {
    center: [SILVERDALE_DEPOT.lat, SILVERDALE_DEPOT.lng],
    zoom: 11,
    style: { height: 520, width: '100%' },
    scrollWheelZoom: true,
    className: 'jobmap-bw',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
        gap: 16,
      }}
    >
      <div
        style={{
          minHeight: 520,
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          position: 'relative',
          boxShadow:
            '0 12px 28px -10px rgba(0,0,0,.28), 0 4px 8px -2px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.5)',
        }}
      >
        <MapContainer {...mapProps}>
          <MapBridge onReady={m => { mapRef.current = m; }} />

          <LayersControl {...{ position: 'topright' }}>
            <LayersControl.BaseLayer {...{ checked: true, name: 'Mono light' }}>
              <TileLayer
                {...{
                  attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
                  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                }}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer {...{ name: 'Mono dark' }}>
              <TileLayer
                {...{
                  attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
                  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                }}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer {...{ name: 'Streets' }}>
              <TileLayer
                {...{
                  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                }}
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <Marker {...{ position: [SILVERDALE_DEPOT.lat, SILVERDALE_DEPOT.lng], icon: depotIcon }}>
            <Tooltip {...{ direction: 'top', offset: [0, -12], permanent: true }}>
              <strong>Silverdale depot</strong>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>FlowPro Depot</strong>
                <div style={{ fontSize: 11, color: '#6B7A88' }}>Silverdale, Auckland</div>
              </div>
            </Popup>
          </Marker>

          {showRings && [5, 10, 20, 30].map(km => (
            <Circle
              key={km}
              {...{
                center: [SILVERDALE_DEPOT.lat, SILVERDALE_DEPOT.lng],
                radius: km * 1000,
                interactive: false,
                pathOptions: {
                  color: '#1BA8D4',
                  weight: 1.25,
                  opacity: 0.45,
                  fillColor: '#1BA8D4',
                  fillOpacity: 0.04,
                  dashArray: '4 6',
                  className: 'jm-ring',
                  interactive: false,
                },
              }}
            />
          ))}

          {suburbs.map(s => {
            const value = sizeBy === 'revenue' ? s.revenue : s.jobs;
            // sqrt-scale so area (not just radius) tracks the metric — keeps
            // small suburbs visible while big ones don't dominate the map.
            const ratio = Math.sqrt(value / maxValue);
            const radius = 6 + ratio * 28;
            const isActive = activeSuburb === s.name;
            return (
              <CircleMarker
                key={s.name}
                {...{
                  center: [s.lat, s.lng],
                  radius: isActive ? radius + 4 : radius,
                  pathOptions: {
                    color: isActive ? '#0D3556' : '#0D7AA0',
                    fillColor: '#1BA8D4',
                    fillOpacity: 0.45 + ratio * 0.4,
                    weight: isActive ? 2.5 : 1.25,
                    opacity: 0.95,
                    className: isActive ? 'jm-circle jm-circle-active' : 'jm-circle',
                  },
                  eventHandlers: {
                    click: () => setActiveSuburb(s.name),
                  },
                }}
              >
                <Tooltip {...{ direction: 'top', offset: [0, -radius], opacity: 1 }}>
                  <div style={{ minWidth: 180, padding: '2px 4px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: '#6B7A88', marginBottom: 6 }}>
                      {s.distKm}km from depot · click to expand
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 4,
                        fontSize: 11,
                      }}
                    >
                      <div>
                        <div style={{ color: '#6B7A88', fontSize: 9 }}>Jobs</div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{s.jobs}</div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7A88', fontSize: 9 }}>Revenue</div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          {fmt(s.revenue, { currency: true, compact: true })}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7A88', fontSize: 9 }}>Avg ticket</div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          {s.avgTicket == null ? '—' : fmt(s.avgTicket, { currency: true, decimals: 0 })}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7A88', fontSize: 9 }}>Most common</div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 11,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 110,
                          }}
                          title={s.topType ?? undefined}
                        >
                          {s.topType ?? '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Vignette + subtle inner shadow for the 3D feel */}
        <div className="jobmap-vignette" aria-hidden />

        {/* Size-by segmented toggle — offset past the Leaflet zoom control */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 60,
            zIndex: 500,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: 2,
            display: 'flex',
            gap: 2,
            boxShadow: '0 2px 6px rgba(0,0,0,.08)',
          }}
          role="group"
          aria-label="Circle size metric"
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--muted)',
              padding: '4px 6px 4px 8px',
              alignSelf: 'center',
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            Size by
          </span>
          {(['jobs', 'revenue'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setSizeBy(opt)}
              aria-pressed={sizeBy === opt}
              style={{
                background: sizeBy === opt ? '#1BA8D4' : 'transparent',
                color: sizeBy === opt ? '#fff' : 'var(--text)',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowRings(v => !v)}
          aria-pressed={showRings}
          style={floatingBtn(12)}
        >
          {showRings ? '◉ Rings on' : '○ Rings off'}
        </button>
        <button
          type="button"
          onClick={() =>
            mapRef.current?.flyTo([SILVERDALE_DEPOT.lat, SILVERDALE_DEPOT.lng], 11, { duration: 0.6 })
          }
          style={floatingBtn(116)}
        >
          ⌖ Reset view
        </button>
      </div>

      {/* Side panel — switches between list and detail when a suburb is active */}
      <div className="stack-v" style={{ minWidth: 0 }}>
        {activeSuburb && suburbs.find(s => s.name === activeSuburb) ? (
          <SuburbDetail
            suburb={suburbs.find(s => s.name === activeSuburb)!}
            onBack={() => setActiveSuburb(null)}
          />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="eyebrow">Top suburbs</span>
              <span className="tiny muted">Click for detail</span>
            </div>
            <div className="stack-v" style={{ gap: 6, maxHeight: 480, overflowY: 'auto' }}>
              {top.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => flyTo(s)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '20px minmax(0,1fr) auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 120ms, border-color 120ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    className="num"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 14,
                      color: 'var(--muted)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.name}
                      {s.primary && <span style={{ color: 'var(--cyan-700)', marginLeft: 4 }}>★</span>}
                    </div>
                    <div className="tiny muted" style={{ whiteSpace: 'nowrap' }}>
                      {s.topType ?? '—'} · {fmt(s.revenue, { currency: true, compact: true })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontWeight: 700, fontSize: 14 }}>
                      {sizeBy === 'revenue'
                        ? fmt(s.revenue, { currency: true, compact: true })
                        : s.jobs}
                    </div>
                    <div className="tiny muted">{sizeBy === 'revenue' ? 'revenue' : 'jobs'}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SuburbDetail({ suburb: s, onBack }: { suburb: SuburbRow; onBack: () => void }) {
  const topTypeShare = s.topTypeShare != null ? Math.round(s.topTypeShare * 100) : null;
  const tenureMonths =
    s.firstJobDate && s.lastJobDate
      ? Math.max(
          1,
          Math.round(
            (new Date(s.lastJobDate).getTime() - new Date(s.firstJobDate).getTime()) /
              (1000 * 60 * 60 * 24 * 30),
          ),
        )
      : null;
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 14,
        background: 'var(--surface)',
        boxShadow: '0 4px 14px -6px rgba(0,0,0,.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">Suburb detail</div>
          <h3 className="card-title" style={{ margin: '2px 0 2px' }}>
            {s.name}
            {s.primary && <span style={{ color: 'var(--cyan-700)', marginLeft: 6 }}>★</span>}
          </h3>
          <div className="tiny muted">
            {s.distKm}km from Silverdale depot
            {tenureMonths != null ? ` · active ${tenureMonths} months` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to suburb list"
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer',
            color: 'var(--muted)',
          }}
        >
          ← Back
        </button>
      </div>

      {/* Top-line stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <StatBox label="Total jobs" value={String(s.jobs)} />
        <StatBox label="Total revenue" value={fmt(s.revenue, { currency: true, compact: true })} />
        <StatBox
          label="Avg ticket"
          value={s.avgTicket == null ? '—' : fmt(s.avgTicket, { currency: true, decimals: 0 })}
        />
        <StatBox label="Last 90 days" value={`${s.recentJobs} jobs`} />
      </div>

      {/* Top job type — the headline insight */}
      {s.topType && (
        <div
          style={{
            border: '1px solid rgba(27,168,212,.35)',
            background: 'rgba(27,168,212,.06)',
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <div className="eyebrow" style={{ color: 'var(--cyan-700)' }}>
            Most common job type
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{s.topType}</div>
            {topTypeShare != null && (
              <div className="tiny muted">{topTypeShare}% of jobs here</div>
            )}
          </div>
        </div>
      )}

      {/* Type breakdown */}
      {s.typeBreakdown.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Job mix
          </div>
          <div className="stack-v" style={{ gap: 4 }}>
            {s.typeBreakdown.map(t => {
              const share = s.jobs > 0 ? t.count / s.jobs : 0;
              return (
                <div key={t.type} style={{ fontSize: 11 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 160,
                      }}
                      title={t.type}
                    >
                      {t.type}
                    </span>
                    <span className="muted">
                      {t.count} · {fmt(t.revenue, { currency: true, compact: true })}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: 'var(--surface-2)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${share * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #1BA8D4 0%, #0D7AA0 100%)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recency */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatBox
          label="Last job"
          value={s.lastJobDate ? formatDate(s.lastJobDate) : '—'}
        />
        <StatBox
          label="First job"
          value={s.firstJobDate ? formatDate(s.firstJobDate) : '—'}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '8px 10px',
        background: 'var(--bg)',
      }}
    >
      <div className="tiny muted" style={{ fontSize: 10 }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: '2-digit' });
}

function floatingBtn(left: number): React.CSSProperties {
  return {
    position: 'absolute',
    bottom: 12,
    left,
    zIndex: 500,
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,.08)',
  };
}
