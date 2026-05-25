// Multi-series area chart for the Sales Performance card.

import { fmt } from '@/lib/format';

export type Series = {
  name: string;
  color: string;
  values: number[];
  areaOpacity?: number;
  dashed?: boolean;
};

export function AreaChart({
  series,
  labels,
  height = 260,
  currency = false,
  gridLines = 5,
}: {
  series: Series[];
  labels: string[];
  height?: number;
  currency?: boolean;
  gridLines?: number;
}) {
  // Single data point can't render a meaningful line/area; skip until we
  // have at least 2 days to plot.
  if (!labels.length || labels.length < 2) {
    return (
      <div className="muted tiny" style={{ padding: 32, textAlign: 'center' }}>
        Not enough data points to render the chart yet.
      </div>
    );
  }

  const padding = { l: 50, r: 16, t: 14, b: 26 };
  const W = 800;
  const H = height;
  const innerW = W - padding.l - padding.r;
  const innerH = H - padding.t - padding.b;

  const allValues = series.flatMap(s => s.values);
  const max = allValues.length ? Math.max(...allValues) * 1.12 || 1 : 1;
  const stepX = innerW / Math.max(1, labels.length - 1);
  const x = (i: number) => padding.l + i * stepX;
  const y = (v: number) => padding.t + innerH - (v / max) * innerH;

  const gridY = Array.from({ length: gridLines }, (_, i) => {
    const ratio = i / (gridLines - 1);
    return { y: padding.t + innerH * (1 - ratio), value: max * ratio };
  });

  return (
    <div className="chart-wrap">
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      {/* Per-series vertical gradients: strong near the line, fades to ~zero
          at the baseline. Gives weight without flatness — much punchier than
          a uniform low opacity. */}
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`areaGrad-${i}-${s.color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={s.color} stopOpacity="0.55" />
            <stop offset="55%"  stopColor={s.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0.10" />
          </linearGradient>
        ))}
      </defs>
      {/* horizontal grid */}
      {gridY.map((g, i) => (
        <g key={i}>
          <line x1={padding.l} x2={W - padding.r} y1={g.y} y2={g.y} stroke="#ECF0F3" strokeWidth="1" />
          <text
            x={padding.l - 8}
            y={g.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="#93A1AE"
            fontFamily="JetBrains Mono, monospace"
          >
            {currency ? fmt(g.value, { currency: true, compact: true }) : fmt(g.value, { compact: true })}
          </text>
        </g>
      ))}
      {/* baseline rule the area sits on */}
      <line
        x1={padding.l}
        x2={W - padding.r}
        y1={padding.t + innerH}
        y2={padding.t + innerH}
        stroke="#D0D9E1"
        strokeWidth="1"
      />
      {/* x labels */}
      {labels.map((l, i) =>
        l ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#93A1AE">
            {l}
          </text>
        ) : null,
      )}
      {/* series */}
      {series.map((s, sIdx) => {
        const pts = s.values.map((v, i): [number, number] => [x(i), y(v)]);
        const path = pts.map(([px, py], i) => (i ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1)).join(' ');
        const area = path + ` L ${x(s.values.length - 1)} ${padding.t + innerH} L ${padding.l} ${padding.t + innerH} Z`;
        const pathLen = innerW * 1.1;
        const delay = sIdx * 0.15;
        return (
          <g key={s.name}>
            <path
              d={area}
              fill={`url(#areaGrad-${sIdx}-${s.color.replace('#', '')})`}
              style={{ opacity: 0, animation: `cardEnter .8s ease-out ${0.4 + delay}s forwards`, animationFillMode: 'forwards' }}
            />
            <path
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.dashed ? '4 4' : undefined}
              className={s.dashed ? undefined : 'chart-draw'}
              style={s.dashed ? undefined : ({ ['--dash' as string]: pathLen, animationDelay: `${delay}s` } as React.CSSProperties)}
            />
            {/* Hover dots — invisible until chart is hovered, full on per-dot hover */}
            {pts.map(([px, py], i) => (
              <circle key={i} className="area-dot" cx={px} cy={py} r="3.5" fill={s.color} stroke="#fff" strokeWidth="1.5">
                <title>{`${labels[i] || `Point ${i + 1}`}: ${currency ? '$' : ''}${Math.round(s.values[i]).toLocaleString()}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
    </div>
  );
}
