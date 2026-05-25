// KPI card: icon · label · big value · delta vs prev · subtitle · sparkline.
// Matches the reference dashboard's KPI primitive.

import { Icon, type IconName } from './Icons';
import { Sparkline } from './charts/Sparkline';
import { fmt } from '@/lib/format';

type Props = {
  icon: IconName;
  label: string;
  value: string;
  unit?: string;
  delta?: number | null;
  sub?: React.ReactNode;
  sparkData?: number[];
  feature?: boolean;
};

export function KpiCard({ icon, label, value, unit, delta, sub, sparkData, feature }: Props) {
  const deltaClass = delta == null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return (
    <div className={`kpi${feature ? ' feature' : ''}`}>
      <div className="kpi-label">
        <span className="ic">
          <Icon name={icon} size={14} stroke={1.8} />
        </span>
        <span>{label}</span>
      </div>
      <div className="kpi-value display num">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      <div className="kpi-foot">
        {delta != null && (
          <span className={`delta ${deltaClass}`}>
            <Icon name={delta > 0 ? 'up' : 'down'} size={10} stroke={2.4} />
            {fmt(Math.abs(delta), { pct: true, decimals: 1 })}
          </span>
        )}
        {sub && <span className="small">{sub}</span>}
      </div>
      {sparkData && sparkData.length >= 2 ? (
        <Sparkline data={sparkData} feature={feature} />
      ) : null}
    </div>
  );
}
