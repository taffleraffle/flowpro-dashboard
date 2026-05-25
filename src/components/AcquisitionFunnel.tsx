import { Funnel } from './charts/Funnel';
import { Icon } from './Icons';
import { fmt } from '@/lib/format';
import type { FunnelData } from '@/lib/metrics';

export function AcquisitionFunnel({ data }: { data: FunnelData }) {
  const stages = [
    { stage: 'Impressions', value: data.impressions },
    { stage: 'Leads', value: data.leads },
    { stage: 'Quotes Sent', value: data.quotesSent },
    { stage: 'Quotes Won', value: data.quotesWon },
  ];

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Marketing</div>
          <h3 className="card-title">Acquisition Funnel</h3>
          <div className="card-sub">Impression → won quote</div>
        </div>
      </div>
      <div className="card-b">
        <Funnel stages={stages} />
        <div className="divider-h" style={{ height: 1, background: 'var(--divider)', margin: '14px 0' }} />
        <div className="row cols-3" style={{ gap: 12 }}>
          <FunnelStat label="Cost / lead" value={data.costPerLead} pending="Needs ad spend" />
          <FunnelStat label="Cost / acq." value={data.costPerAcq} pending="Needs ad spend" />
          <FunnelStat
            label="Win rate"
            value={data.leads > 0 ? data.quotesWon / data.leads : null}
            pct
            pending="No leads yet"
          />
        </div>
      </div>
    </div>
  );
}

function FunnelStat({
  label,
  value,
  pct,
  pending,
}: {
  label: string;
  value: number | null;
  pct?: boolean;
  pending: string;
}) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="display num" style={{ fontSize: 22, marginTop: 4 }}>
        {value == null ? '—' : pct ? fmt(value, { pct: true, decimals: 1 }) : fmt(value, { currency: true, decimals: 0 })}
      </div>
      <div className="tiny muted">{value == null ? pending : ' '}</div>
    </div>
  );
}
