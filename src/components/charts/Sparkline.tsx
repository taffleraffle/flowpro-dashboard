// Tiny inline-SVG area sparkline used inside KPI cards.

export function Sparkline({
  data,
  width = 200,
  height = 32,
  feature = false,
  fill = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  feature?: boolean;
  fill?: boolean;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i): [number, number] => [
    i * stepX,
    height - ((v - min) / range) * (height - 4) - 2,
  ]);
  const path = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  const area = path + ` L ${width} ${height} L 0 ${height} Z`;
  const stroke = feature ? '#7DD3E8' : '#1BA8D4';
  const gradId = feature ? 'sparkGrad-feature' : 'sparkGrad-base';
  // Estimate the path length so chart-draw can size its dasharray correctly.
  const pathLength = Math.max(100, data.length * (width / data.length));
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ marginTop: 4 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={stroke} stopOpacity={feature ? '0.5' : '0.35'} />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {fill && (
        <path
          d={area}
          fill={`url(#${gradId})`}
          style={{ opacity: 0, animation: 'cardEnter .6s ease-out .3s forwards' }}
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="chart-draw-fast"
        style={{ ['--dash' as string]: pathLength }}
      />
    </svg>
  );
}
