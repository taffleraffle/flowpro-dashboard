import { Suspense } from 'react';
import { TopBar, SubBar, PageFooter } from '@/components/Shell';
import { resolveWindow } from '@/lib/periods';
import {
  MarketingKpiStrip,
  RollingSummaryTable,
  DailyTracker,
} from '@/components/marketing/MarketingCards';
import { LeadSourceDetail } from '@/components/marketing/LeadSourceDetail';
import { SEOPerformance } from '@/components/marketing/SEOPerformance';
import { CampaignsTable } from '@/components/marketing/CampaignsTable';
import { KeywordsTable } from '@/components/marketing/KeywordsTable';
import { JobAttribution } from '@/components/marketing/JobAttribution';
import { AcquisitionFunnel } from '@/components/AcquisitionFunnel';
import { getFunnel, getActiveErrors, getAttributionSummary } from '@/lib/metrics';
import {
  getMarketingBundle,
  getChannelGroups,
  getCampaigns,
  getKeywords,
} from '@/lib/marketing-metrics';

export const dynamic = 'force-dynamic';

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const win = resolveWindow(searchParams);
  const window = { startDate: win.startDate, endDate: win.endDate };
  const label = win.source === 'custom' ? `${win.startDate} → ${win.endDate}` : win.period;

  const [bundle, channelGroups, campaigns, keywords, funnel, errorRuns, attribution] = await Promise.all([
    getMarketingBundle(window),
    getChannelGroups(window),
    getCampaigns(window),
    getKeywords(window),
    getFunnel(window),
    getActiveErrors(),
    getAttributionSummary(window),
  ]);
  const { rolling, daily } = bundle;

  return (
    <>
      <TopBar syncErrors={errorRuns.length} />
      <Suspense>
        <SubBar title="Marketing" crumb={`Dashboard · Marketing · ${label}`} />
      </Suspense>
      <div className="page">
        <MarketingKpiStrip rolling={rolling} windowLabel={label} />
        <JobAttribution summary={attribution} />
        <RollingSummaryTable rolling={rolling} />
        <LeadSourceDetail groups={channelGroups} />
        <div className="row split-3-2">
          <DailyTracker rows={daily} />
          <SEOPerformance />
        </div>
        <div className="row split-2-1">
          <AcquisitionFunnel data={funnel} />
          <CampaignsTable rows={campaigns} />
        </div>
        <KeywordsTable rows={keywords} />
        <PageFooter />
      </div>
    </>
  );
}
