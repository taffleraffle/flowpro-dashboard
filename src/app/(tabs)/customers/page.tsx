import { Suspense } from 'react';
import { TopBar, SubBar, PageFooter } from '@/components/Shell';
import { resolveWindow } from '@/lib/periods';
import {
  CustomersKpiStrip,
  CustomerGrowthChart,
  CustomerSegmentsCard,
  CustomerRosterTable,
} from '@/components/customers/CustomersCards';
import { TopCustomersBySpend } from '@/components/sales/SalesCards';
import { getActiveErrors } from '@/lib/metrics';
import { getCustomersBundle } from '@/lib/customers-metrics';
import { getTopCustomers } from '@/lib/sales-metrics';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const win = resolveWindow(searchParams);
  const label = win.source === 'custom' ? `${win.startDate} → ${win.endDate}` : win.period;

  const [bundle, wcTopCustomers, errorRuns] = await Promise.all([
    getCustomersBundle(),
    getTopCustomers(8),
    getActiveErrors(),
  ]);
  const { kpis, segments, growth, roster } = bundle;

  return (
    <>
      <TopBar syncErrors={errorRuns.length} />
      <Suspense>
        <SubBar title="Customers" crumb={`Dashboard · Customers · ${label}`} />
      </Suspense>
      <div className="page">
        <CustomersKpiStrip k={kpis} />
        <div className="row split-3-2">
          <CustomerGrowthChart rows={growth} />
          <CustomerSegmentsCard rows={segments} />
        </div>
        <CustomerRosterTable rows={roster} limit={60} />
        <TopCustomersBySpend rows={wcTopCustomers} />
        <PageFooter />
      </div>
    </>
  );
}
