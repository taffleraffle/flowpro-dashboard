// Horizontal funnel bars used in the Acquisition Funnel card.

import { fmt } from '@/lib/format';

export type FunnelStage = { stage: string; value: number | null };

export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const known = stages.filter(s => s.value != null && s.value > 0);
  const top = known.length ? Math.max(...known.map(s => s.value as number)) : 0;
  return (
    <div className="stack-v" style={{ gap: 6 }}>
      {stages.map((s, i) => {
        const v = s.value;
        const pct = top > 0 && v != null ? v / top : 0;
        const prev = i > 0 ? stages[i - 1].value : null;
        const conv = i > 0 && v != null && prev != null && prev > 0 ? v / prev : null;
        return (
          <div key={s.stage}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, alignItems: 'baseline' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.stage}</span>
                {conv != null && (
                  <span className="tiny muted" style={{ marginLeft: 8 }}>
                    {fmt(conv, { pct: true, decimals: 1 })} conv.
                  </span>
                )}
              </div>
              <div className="num" style={{ fontWeight: 700 }}>
                {v == null ? '—' : fmt(v, { compact: true })}
              </div>
            </div>
            <div
              style={{
                height: 32,
                width: pct > 0 ? `${pct * 100}%` : '12%',
                background:
                  pct > 0
                    ? 'linear-gradient(90deg, var(--navy-700), var(--cyan-600))'
                    : 'repeating-linear-gradient(45deg, var(--surface-2) 0 8px, var(--bg) 8px 16px)',
                borderRadius: 6,
                minWidth: 60,
                transition: 'width .5s ease',
                border: pct > 0 ? '0' : '1px dashed var(--border-2)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
