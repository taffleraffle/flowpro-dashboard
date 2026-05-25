import { Suspense } from 'react';
import { TopBar, SubBar, PageFooter } from '@/components/Shell';
import { resolveWindow } from '@/lib/periods';
import {
  SalesKpiStrip,
  SalesTrend12Wk,
  ProfitMarginByService,
  RevenueByWeekday,
  QuotesPipelineTable,
  TopCustomersBySpend,
} from '@/components/sales/SalesCards';
import { getActiveErrors } from '@/lib/metrics';
import {
  getSalesKpis,
  getSalesWeeklyTrend,
  getRevenueByWeekday,
  getActiveQuotes,
  getTopCustomers,
} from '@/lib/sales-metrics';

export const dynamic = 'force-dynamic';

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const win = resolveWindow(searchParams);
  const window = { startDate: win.startDate, endDate: win.endDate };
  const label = win.source === 'custom' ? `${win.startDate} → ${win.endDate}` : win.period;

  const [kpis, weekly, weekday, quotes, topCustomers, errorRuns] = await Promise.all([
    getSalesKpis(window),
    getSalesWeeklyTrend(window),
    getRevenueByWeekday(window),
    getActiveQuotes(window),
    getTopCustomers(8),
    getActiveErrors(),
  ]);

  return (
    <>
      <TopBar syncErrors={errorRuns.length} />
      <Suspense>
        <SubBar title="Sales" crumb={`Dashboard · Sales · ${label}`} />
      </Suspense>
      <div className="page">
        <SalesKpiStrip k={kpis} windowLabel={label} />
        <SalesTrend12Wk rows={weekly} />
        <div className="row split-3-2">
          <ProfitMarginByService />
          <RevenueByWeekday rows={weekday} />
        </div>
        <QuotesPipelineTable rows={quotes} />
        <TopCustomersBySpend rows={topCustomers} />
        <PageFooter />
      </div>
    </>
  );
}
