import { Suspense } from 'react';
import { TopBar, SubBar, PageFooter } from '@/components/Shell';
import { resolveWindow } from '@/lib/periods';
import {
  OpsKpiStrip,
  HourlyLoadChart,
  StatusBreakdown,
  TechWeekGrid,
  SLATracker,
  FleetCard,
  InventoryCard,
} from '@/components/operations/OpsCards';
import { getActiveErrors } from '@/lib/metrics';
import { getOpsKpis, getHourlyLoad, getStatusDistribution } from '@/lib/ops-metrics';

export const dynamic = 'force-dynamic';

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const win = resolveWindow(searchParams);
  const window = { startDate: win.startDate, endDate: win.endDate };
  const label = win.source === 'custom' ? `${win.startDate} → ${win.endDate}` : win.period;

  const [kpis, hourly, status, errorRuns] = await Promise.all([
    getOpsKpis(window),
    getHourlyLoad(window),
    getStatusDistribution(),
    getActiveErrors(),
  ]);

  return (
    <>
      <TopBar syncErrors={errorRuns.length} />
      <Suspense>
        <SubBar title="Operations" crumb={`Dashboard · Operations · ${label}`} />
      </Suspense>
      <div className="page">
        <OpsKpiStrip k={kpis} windowLabel={label} />
        <TechWeekGrid />
        <div className="row split-2-1">
          <HourlyLoadChart rows={hourly} />
          <SLATracker />
        </div>
        <StatusBreakdown rows={status} />
        <div className="row split-3-2">
          <FleetCard />
          <InventoryCard />
        </div>
        <PageFooter />
      </div>
    </>
  );
}
