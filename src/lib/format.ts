// Format helpers. Goal: numbers should NEVER read like "12,818 k" — either
// show the full number or compact to one tier ($12.8M), never both.

type FmtOpts = {
  currency?: boolean;
  decimals?: number;
  compact?: boolean;
  plus?: boolean;
  pct?: boolean;
  suffix?: string;
};

export function fmt(n: number | null | undefined, opts: FmtOpts = {}): string {
  const { currency, decimals = 0, compact, plus, pct, suffix = '' } = opts;
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  let v = n;
  if (pct) v = n * 100;
  let s: string;
  if (compact && Math.abs(v) >= 1000) {
    const abs = Math.abs(v);
    const trim = (x: string) => x.replace(/\.0+([kMB])$/, '$1');
    if (abs >= 1e9) {
      s = trim((v / 1e9).toFixed(1) + 'B');
    } else if (abs >= 1e6) {
      // $1.2M for sub-$10M, $12M for $10M+ (one decimal is enough — round numbers feel cleaner)
      s = trim((v / 1e6).toFixed(abs >= 1e7 ? 1 : 2) + 'M');
    } else if (abs >= 1e4) {
      // $12k for $10k+ — no decimals (the precision wouldn't matter at a glance)
      s = trim((v / 1000).toFixed(0) + 'k');
    } else {
      s = trim((v / 1000).toFixed(1) + 'k');
    }
  } else {
    s = v.toLocaleString('en-NZ', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  if (currency) s = '$' + s;
  if (pct) s += '%';
  if (suffix) s += suffix;
  if (plus && n > 0 && !s.startsWith('+')) s = '+' + s;
  return s;
}
