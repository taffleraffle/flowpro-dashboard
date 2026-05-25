// === Atoms, charts, icons for Flowpro dashboard ===

const { useState, useEffect, useMemo, useRef } = React;

// ===== Number formatting =====
function fmt(n, opts = {}) {
  const { currency, decimals = 0, compact = false, plus = false, suffix = '', pct = false } = opts;
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  let v = n;
  if (pct) v = n * 100;
  let s;
  if (compact && Math.abs(v) >= 1000) {
    if (Math.abs(v) >= 1e6) s = (v / 1e6).toFixed(1) + 'M';
    else s = (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k';
  } else {
    s = v.toLocaleString('en-NZ', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  if (currency) s = '$' + s;
  if (pct) s += '%';
  if (suffix) s += suffix;
  if (plus && n > 0 && !s.startsWith('+')) s = '+' + s;
  return s;
}
window.fmt = fmt;

// ===== Icons (inline SVG, 1.5 stroke) =====
const Icon = ({ name, size = 16, stroke = 1.6, className = '' }) => {
  const paths = {
    bolt:     'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
    truck:    'M3 7h11v9H3zM14 10h4l3 3v3h-7zM6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    cash:     'M2 6h20v12H2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM5 9v.01M19 14.99V15',
    chart:    'M3 21V3M3 21h18M7 17V11M12 17V7M17 17V13',
    target:   'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    map:      'M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
    pin:      'M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    star:     'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z',
    star_f:   'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z',
    users:    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    user:     'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    bell:     'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.7 21a2 2 0 0 1-3.4 0',
    search:   'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
    calendar: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18',
    clock:    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    phone:    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
    home:     'M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V9z',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    up:       'M7 17L17 7M17 7H8M17 7v9',
    down:     'M17 7L7 17M7 17h9M7 17V8',
    arrow_r:  'M5 12h14M12 5l7 7-7 7',
    plus:     'M12 5v14M5 12h14',
    droplet:  'M12 2.69l5.66 5.66a8 8 0 1 1-11.32 0z',
    flame:    'M8 14s-1.5-2 1-5 2-3 2-3 .5 3 3 5 3 4 3 6a6 6 0 1 1-12 0c0-1.5 1-3 3-3z',
    wrench:   'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8L13 11l-1.1-1.9 2.8-2.8z',
    sparkle:  'M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4',
    eye:      'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    check:    'M20 6L9 17l-5-5',
    x:        'M18 6L6 18M6 6l12 12',
    alert:    'M12 2L1 21h22L12 2zM12 9v4M12 17v.01',
    trend:    'M3 17l6-6 4 4 8-8M14 7h7v7',
    arrow_ur: 'M7 17L17 7M7 7h10v10',
    receipt:  'M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2zM9 7h6M9 11h6M9 15h4',
    list:     'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    chevron_r:'M9 18l6-6-6-6',
    chevron_d:'M6 9l6 6 6-6',
    menu:     'M3 12h18M3 6h18M3 18h18',
    filter:   'M3 6h18M6 12h12M10 18h4',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    grid:     'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  };
  const filled = name === 'star_f';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name] || ''} />
    </svg>
  );
};
window.Icon = Icon;

// ===== KPI Card =====
function KPI({ icon, label, value, unit, delta, sub, sparkData, feature, color = 'cyan' }) {
  const deltaClass = delta == null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return (
    <div className={`kpi${feature ? ' feature' : ''}`}>
      <div className="kpi-label">
        {icon && <span className="ic"><Icon name={icon} size={14} stroke={1.8} /></span>}
        <span>{label}</span>
      </div>
      <div className="kpi-value display num">
        {value}{unit && <span className="unit">{unit}</span>}
      </div>
      <div className="kpi-foot">
        {delta != null && (
          <span className={`delta ${deltaClass}`}>
            <Icon name={delta > 0 ? 'up' : 'down'} size={11} stroke={2.4} />
            {fmt(Math.abs(delta), { pct: true, decimals: 1 })}
          </span>
        )}
        {sub && <span className="small">{sub}</span>}
      </div>
      {sparkData && <Sparkline className="spark" data={sparkData} feature={feature} />}
    </div>
  );
}
window.KPI = KPI;

// ===== Sparkline =====
function Sparkline({ data, width = 200, height = 30, feature = false, fill = true, className = '' }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2]);
  const path = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  const area = path + ` L ${width} ${height} L 0 ${height} Z`;
  const stroke = feature ? '#7DD3E8' : '#1BA8D4';
  const fillC  = feature ? 'rgba(125,211,232,.18)' : 'rgba(27,168,212,.13)';
  return (
    <svg className={className} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fill && <path d={area} fill={fillC} />}
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
window.Sparkline = Sparkline;

// ===== Multi-line / area chart =====
function AreaChart({ series, labels, height = 240, currency = false, gridLines = 5, showAxis = true }) {
  // series: [{name, color, values, dashed?, areaOpacity?}]
  const padding = { l: 50, r: 16, t: 14, b: 26 };
  const W = 800, H = height;
  const innerW = W - padding.l - padding.r;
  const innerH = H - padding.t - padding.b;

  const allValues = series.flatMap(s => s.values);
  const min = 0;
  const max = Math.max(...allValues) * 1.12;
  const range = max - min || 1;
  const stepX = innerW / (labels.length - 1);
  const x = i => padding.l + i * stepX;
  const y = v => padding.t + innerH - ((v - min) / range) * innerH;

  const ticks = [];
  for (let i = 0; i <= gridLines; i++) {
    const v = min + (range / gridLines) * i;
    ticks.push({ v, y: y(v) });
  }
  const xLabelEvery = Math.ceil(labels.length / 7);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`grad-${i}-${s.name.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity={s.areaOpacity ?? 0.18} />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* grid */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padding.l} x2={W - padding.r} y1={t.y} y2={t.y} stroke="#ECF0F3" strokeWidth="1" />
          {showAxis && (
            <text x={padding.l - 8} y={t.y + 4} fontSize="10" fill="#93A1AE" textAnchor="end" fontFamily="system-ui">
              {currency ? '$' + fmt(t.v, { compact: true }) : fmt(t.v, { compact: true })}
            </text>
          )}
        </g>
      ))}

      {/* x labels */}
      {showAxis && labels.map((l, i) => (
        i % xLabelEvery === 0 || i === labels.length - 1 ? (
          <text key={i} x={x(i)} y={H - 8} fontSize="10" fill="#93A1AE" textAnchor="middle" fontFamily="system-ui">{l}</text>
        ) : null
      ))}

      {/* areas */}
      {series.map((s, i) => {
        const path = s.values.map((v, j) => (j ? 'L' : 'M') + x(j).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
        const area = path + ` L ${x(s.values.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
        return (
          <g key={i}>
            {!s.dashed && <path d={area} fill={`url(#grad-${i}-${s.name.replace(/\s/g,'')})`} />}
            <path d={path} fill="none" stroke={s.color} strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={s.dashed ? '4 4' : '0'} />
          </g>
        );
      })}
    </svg>
  );
}
window.AreaChart = AreaChart;

// ===== Stacked bar chart (vertical) =====
function StackedBars({ data, keys, colors, height = 220, currency = false }) {
  // data: [{label, ...keyValues}], keys: [k1,k2], colors: {k1: color}
  const padding = { l: 44, r: 12, t: 10, b: 24 };
  const W = 800, H = height;
  const innerW = W - padding.l - padding.r;
  const innerH = H - padding.t - padding.b;
  const totals = data.map(d => keys.reduce((s, k) => s + (d[k] || 0), 0));
  const max = Math.max(...totals) * 1.1;
  const stepX = innerW / data.length;
  const barW = stepX * 0.6;
  const y = v => padding.t + innerH - (v / max) * innerH;
  const gridLines = 4;
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => max * i / gridLines);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none">
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={padding.l} x2={W - padding.r} y1={y(v)} y2={y(v)} stroke="#ECF0F3" />
          <text x={padding.l - 8} y={y(v) + 4} fontSize="10" fill="#93A1AE" textAnchor="end">
            {currency ? '$' + fmt(v, { compact: true }) : fmt(v, { compact: true })}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        let cursorY = y(0);
        const cx = padding.l + i * stepX + stepX / 2;
        return (
          <g key={i}>
            {keys.map((k, ki) => {
              const v = d[k] || 0;
              const h = y(0) - y(v);
              cursorY -= h;
              return (
                <rect key={k} x={cx - barW/2} y={cursorY} width={barW} height={h}
                      fill={colors[k]} rx={ki === keys.length - 1 ? 3 : 0} />
              );
            })}
            <text x={cx} y={H - 8} fontSize="10" fill="#93A1AE" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
window.StackedBars = StackedBars;

// ===== Donut chart =====
function Donut({ data, size = 180, thickness = 26, centerLabel, centerValue }) {
  // data: [{label, value, color}]
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - thickness / 2 - 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ECF0F3" strokeWidth={thickness} />
      {data.map((d, i) => {
        const frac = d.value / total;
        const len = frac * circ;
        const off = circ - acc;
        acc += len;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                  stroke={d.color} strokeWidth={thickness}
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={off}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  strokeLinecap="butt" />
        );
      })}
      {centerValue && (
        <g textAnchor="middle">
          <text x={cx} y={cy - 4} fontFamily="Barlow Condensed" fontWeight="700" fontSize="28" fill="#0A2540">{centerValue}</text>
          {centerLabel && <text x={cx} y={cy + 16} fontSize="10" fill="#6B7A88" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{centerLabel}</text>}
        </g>
      )}
    </svg>
  );
}
window.Donut = Donut;

// ===== Horizontal bar list =====
function HBars({ items, max, colorKey, valueFmt = v => v, footFmt }) {
  const M = max || Math.max(...items.map(i => i.value));
  return (
    <div className="stack-v" style={{ gap: 14 }}>
      {items.map((it, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
            <div className="stack-h" style={{ minWidth: 0 }}>
              <span className="swatch" style={{ background: it.color }}></span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{it.label}</span>
            </div>
            <div className="num" style={{ fontWeight: 700, fontSize: 13 }}>{valueFmt(it.value)}</div>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(it.value / M) * 100}%`, background: it.color }} />
          </div>
          {footFmt && <div className="tiny muted" style={{ marginTop: 4 }}>{footFmt(it)}</div>}
        </div>
      ))}
    </div>
  );
}
window.HBars = HBars;

// ===== Funnel =====
function Funnel({ stages }) {
  const top = stages[0].value;
  return (
    <div className="stack-v" style={{ gap: 6 }}>
      {stages.map((s, i) => {
        const pct = s.value / top;
        const conv = i === 0 ? null : s.value / stages[i - 1].value;
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, alignItems: 'baseline' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.stage}</span>
                {conv != null && <span className="tiny muted" style={{ marginLeft: 8 }}>{fmt(conv, { pct: true, decimals: 1 })} conv.</span>}
              </div>
              <div className="num" style={{ fontWeight: 700 }}>{fmt(s.value, { compact: true })}</div>
            </div>
            <div style={{
              height: 32,
              width: `${pct * 100}%`,
              background: `linear-gradient(90deg, var(--navy-700), var(--cyan-600))`,
              borderRadius: 6,
              minWidth: 60,
              transition: 'width .5s ease',
            }} />
          </div>
        );
      })}
    </div>
  );
}
window.Funnel = Funnel;

// ===== Rating display =====
function Stars({ value, size = 12 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1, color: '#E8A93C', verticalAlign: 'middle' }}>
      {[1,2,3,4,5].map(i => (
        <Icon key={i} name={i <= Math.round(value) ? 'star_f' : 'star'} size={size} stroke={1.2} />
      ))}
    </span>
  );
}
window.Stars = Stars;
