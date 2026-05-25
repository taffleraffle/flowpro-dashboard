// SVG donut chart for the Revenue by Service card.

export type DonutSlice = { label: string; value: number; color: string };

export function Donut({
  data,
  size = 180,
  thickness = 26,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - thickness / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ECF0F3" strokeWidth={thickness} />
      {total > 0 &&
        data.map((d, i) => {
          const frac = d.value / total;
          const len = frac * circ;
          const off = circ - acc;
          acc += len;
          return (
            <circle
              key={i}
              className="donut-slice"
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={off}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
              style={{
                // Reveal each slice in turn — start from full dasharray (invisible),
                // then animate down to the correct visible length.
                animation: `donutSweep .9s cubic-bezier(.4, 0, .2, 1) ${i * 0.12}s both`,
                ['--circ' as string]: circ,
                ['--final-offset' as string]: off,
              }}
            >
              <title>{`${d.label}: $${(d.value / 1000).toFixed(1)}k · ${((d.value / total) * 100).toFixed(0)}%`}</title>
            </circle>
          );
        })}
      {centerValue && (
        <g textAnchor="middle">
          <text
            x={cx}
            y={cy - 4}
            fontFamily="Barlow Condensed"
            fontWeight="700"
            fontSize="28"
            fill="#0A2540"
          >
            {centerValue}
          </text>
          {centerLabel && (
            <text
              x={cx}
              y={cy + 16}
              fontSize="10"
              fill="#6B7A88"
              style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              {centerLabel}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
