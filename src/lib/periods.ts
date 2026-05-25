// Period & custom date-range helpers — server-safe (no React).

export const PERIODS = ['7D', '30D', 'QTD', 'YTD'] as const;
export type Period = (typeof PERIODS)[number];

export function isPeriod(v: unknown): v is Period {
  return typeof v === 'string' && (PERIODS as readonly string[]).includes(v);
}
export function parsePeriod(v: unknown): Period {
  return isPeriod(v) ? v : '30D';
}

export type DateWindow = { startDate: string; endDate: string; days: number };

function periodWindow(period: Period): DateWindow {
  const end = new Date();
  const endDate = end.toISOString().slice(0, 10);
  let days: number;
  switch (period) {
    case '7D': days = 7; break;
    case '30D': days = 30; break;
    case 'QTD': {
      const start = new Date(Date.UTC(end.getUTCFullYear(), Math.floor(end.getUTCMonth() / 3) * 3, 1));
      days = Math.max(1, Math.ceil((+end - +start) / 86_400_000) + 1);
      break;
    }
    case 'YTD': {
      const start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
      days = Math.max(1, Math.ceil((+end - +start) / 86_400_000) + 1);
      break;
    }
    default: { const _: never = period; void _; days = 30; }
  }
  const startDate = new Date(end.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  return { startDate, endDate, days };
}

// Resolve a window from URL searchParams.
// - ?from=YYYY-MM-DD&to=YYYY-MM-DD wins (custom range from the date pill)
// - else ?period=7D|30D|QTD|YTD
// - else default 30D
export function resolveWindow(searchParams: Record<string, string | string[] | undefined>): DateWindow & { source: 'custom' | 'period'; period: Period } {
  const period = parsePeriod(asString(searchParams.period));
  const from = asString(searchParams.from);
  const to = asString(searchParams.to);
  if (isValidISO(from) && isValidISO(to) && from <= to) {
    const days = Math.max(1, Math.round((+new Date(to + 'T00:00:00Z') - +new Date(from + 'T00:00:00Z')) / 86_400_000) + 1);
    return { startDate: from, endDate: to, days, source: 'custom', period };
  }
  return { ...periodWindow(period), source: 'period', period };
}

function asString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function isValidISO(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(+new Date(v + 'T00:00:00Z'));
}

// Back-compat for callers that still take a Period directly.
export function periodToWindow(period: Period): DateWindow {
  return periodWindow(period);
}
