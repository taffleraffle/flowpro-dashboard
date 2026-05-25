import { AreaChart } from './charts/AreaChart';
import { fmt } from '@/lib/format';
import type { DailySeries } from '@/lib/metrics';

// 7-day trailing moving average. Smooths weekend $0 cliffs without lying:
// each point is real revenue averaged over the previous 7 days.
function rollingAvg(values: number[], window = 7): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    const denom = Math.min(i + 1, window);
    out.push(sum / denom);
  }
  return out;
}

// Two modes:
// 1. Revenue mode (SimPro live): plot rolling revenue.
// 2. Leads mode (SimPro blocked): plot daily leads.
export function RevenueTrend({
  series,
  leads,
  windowLabel,
}: {
  series: DailySeries;
  leads: number[];
  windowLabel?: string;
}) {
  const totalRev = series.revenue.reduce((a, b) => a + b, 0);
  const totalLeads = leads.reduce((a, b) => a + b, 0);
  const hasRevenue = totalRev > 0;

  // Trim trailing days that have incomplete data. SimPro invoicing + completion
  // timestamps lag by 1-3 days; the last two days of a window otherwise look
  // like a false "drop" at the right edge.
  const TRIM = 2;
  const trimmedDates = series.dates.slice(0, -TRIM);
  const trimmedRevenue = series.revenue.slice(0, -TRIM);
  const trimmedLeads = leads.slice(0, -TRIM);

  // Smoothing window scales with how much data we have. On a 7D selector
  // a 7-day rolling average is a flat line — drop to 3-day. On longer windows,
  // 7-day reads as the canonical "trend".
  const smoothing = trimmedDates.length >= 14 ? 7 : 3;
  const smoothedRevenue = rollingAvg(trimmedRevenue, smoothing);
  const smoothedLeads = rollingAvg(trimmedLeads, Math.min(smoothing, 3));

  // Label every ~5th tick + last tick. For short windows show every other day.
  const tickEvery = trimmedDates.length <= 14 ? 2 : 5;
  const labels = trimmedDates.map((d, i) => {
    const dt = new Date(d + 'T00:00:00Z');
    return i % tickEvery === 0 || i === trimmedDates.length - 1
      ? `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`
      : '';
  });

  const period = windowLabel ?? 'selected period';
  const totalLabel = hasRevenue
    ? fmt(totalRev, { currency: true, compact: true })
    : fmt(totalLeads);

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Sales performance</div>
          <h3 className="card-title">Revenue trend</h3>
          <div className="card-sub">
            {smoothing}-day rolling average · {period}
          </div>
        </div>
        <div className="legend">
          <span className="item">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: '#1BA8D4',
                display: 'inline-block',
                marginRight: 6,
              }}
            />
            Total in {period}{' '}
            <b style={{ marginLeft: 4 }}>{totalLabel}</b>
          </span>
        </div>
      </div>
      <div className="card-b">
        <AreaChart
          labels={labels}
          currency={hasRevenue}
          series={[
            {
              name: hasRevenue ? 'Revenue' : 'Leads',
              color: '#1BA8D4',
              values: hasRevenue ? smoothedRevenue : smoothedLeads,
              areaOpacity: 0.18,
            },
          ]}
        />
        {!hasRevenue && (
          <div className="muted tiny" style={{ marginTop: 8, textAlign: 'center' }}>
            Switches to revenue once SimPro completed-jobs sync runs.
          </div>
        )}
      </div>
    </div>
  );
}
