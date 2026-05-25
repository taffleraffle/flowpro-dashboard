// Real OpenStreetMap-backed job geography card. Dynamic-imports the Leaflet
// client component because Leaflet needs `window` and breaks SSR otherwise.

import dynamic from 'next/dynamic';
import { fmt } from '@/lib/format';
import { Icon } from './Icons';
import type { SuburbRow } from '@/lib/suburbs';

// Travel-cost assumptions. Update these here as fuel prices move.
// Sources: MBIE weekly oil-price monitor (NZ avg diesel ~ NZ$1.98/L May 2026)
// + RUC of ~$0.76/L equivalent for diesel light vehicles. Plumber van fuel
// economy benchmark: 11 L/100km loaded (Ford Transit Custom / Hilux diesel).
const DIESEL_PRICE_NZD_PER_L = 1.98;
const FUEL_ECONOMY_L_PER_100KM = 11;

const JobMapClient = dynamic(
  () => import('./JobMapClient').then(m => m.JobMapClient),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 520,
          background:
            'linear-gradient(90deg, var(--surface-2) 0%, var(--bg) 50%, var(--surface-2) 100%)',
          backgroundSize: '200% 100%',
          animation: 'skeletonShimmer 1.4s ease-in-out infinite',
          borderRadius: 10,
        }}
      />
    ),
  },
);

export function JobMap({ suburbs }: { suburbs: SuburbRow[] }) {
  if (suburbs.length === 0) {
    return (
      <div className="card">
        <div className="card-h">
          <div>
            <div className="eyebrow">Job geography</div>
            <h3 className="card-title">Where jobs happen</h3>
            <div className="card-sub">No matched suburbs yet</div>
          </div>
        </div>
        <div className="card-b muted tiny" style={{ padding: 40, textAlign: 'center' }}>
          No completed jobs have matched a known Auckland suburb. Add more in
          <code> src/lib/suburbs.ts</code>.
        </div>
      </div>
    );
  }

  const totalJobs = suburbs.reduce((s, x) => s + x.jobs, 0);
  const wAvg = suburbs.reduce((s, x) => s + x.distKm * x.jobs, 0) / totalJobs;
  const closeCount = suburbs.filter(s => s.distKm <= 10).reduce((a, b) => a + b.jobs, 0);

  // Travel cost per job = round-trip distance × (fuel economy / 100) × price/L
  const roundTripKm = wAvg * 2;
  const fuelCostPerJob = roundTripKm * (FUEL_ECONOMY_L_PER_100KM / 100) * DIESEL_PRICE_NZD_PER_L;
  // Annualised — what we burn on fuel just getting to jobs each year.
  // Take last-12-month job count from `recentJobs` per suburb where available;
  // fall back to a prorated estimate over the visible job set.
  const recentJobs = suburbs.reduce((s, x) => s + (x.recentJobs ?? 0), 0);
  // recentJobs covers 90 days → multiply by 4 for an annualised view.
  const annualJobs = recentJobs > 0 ? recentJobs * 4 : totalJobs;
  const annualFuelCost = fuelCostPerJob * annualJobs;

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Job geography</div>
          <h3 className="card-title">Where jobs happen</h3>
          <div className="card-sub">
            Hub: Silverdale depot · {fmt(totalJobs)} jobs · {wAvg.toFixed(1)}km weighted avg ·
            scroll to zoom, click suburbs to focus
          </div>
        </div>
        <span className="badge cyan">
          <Icon name="map" size={11} /> {fmt(closeCount)} jobs within 10km
        </span>
      </div>

      {/* Travel-cost banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
          gap: 10,
          padding: '0 16px 12px',
        }}
      >
        <TravelStat
          label="Avg distance per job"
          value={`${wAvg.toFixed(1)}km`}
          sub={`${roundTripKm.toFixed(1)}km round-trip from depot`}
        />
        <TravelStat
          label="Avg fuel cost per job"
          value={fmt(fuelCostPerJob, { currency: true, decimals: 2 })}
          sub={`NZ$${DIESEL_PRICE_NZD_PER_L.toFixed(2)}/L diesel · ${FUEL_ECONOMY_L_PER_100KM}L/100km`}
          highlight
        />
        <TravelStat
          label="Annualised fuel burn"
          value={fmt(annualFuelCost, { currency: true, compact: true })}
          sub={`across ~${fmt(annualJobs)} jobs/year`}
        />
      </div>

      <div className="card-b">
        <JobMapClient suburbs={suburbs} />
      </div>
    </div>
  );
}

function TravelStat({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        border: '1px solid',
        borderColor: highlight ? 'rgba(27,168,212,.35)' : 'var(--border)',
        background: highlight ? 'rgba(27,168,212,.06)' : 'var(--bg)',
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <div
        className="eyebrow"
        style={{
          fontSize: 10,
          color: highlight ? 'var(--cyan-700)' : 'var(--muted)',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.1 }}>{value}</div>
      <div className="tiny muted" style={{ fontSize: 10, marginTop: 2 }}>
        {sub}
      </div>
    </div>
  );
}
