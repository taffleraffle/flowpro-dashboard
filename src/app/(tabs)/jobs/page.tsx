import { Suspense } from 'react';
import { TopBar, SubBar, PageFooter } from '@/components/Shell';
import { resolveWindow } from '@/lib/periods';
import {
  JobsKpiStrip,
  JobPipelineKanban,
  JobTypesTable,
  DurationValueScatter,
  AllJobsTable,
} from '@/components/jobs/JobsCards';
import { JobMap } from '@/components/JobMap';
import { getActiveErrors } from '@/lib/metrics';
import { getSuburbDistribution } from '@/lib/suburbs';
import {
  getJobsKpis,
  getPipeline,
  getJobTypes,
  getAllJobs,
} from '@/lib/jobs-metrics';

export const dynamic = 'force-dynamic';

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const win = resolveWindow(searchParams);
  const window = { startDate: win.startDate, endDate: win.endDate };
  const label = win.source === 'custom' ? `${win.startDate} → ${win.endDate}` : win.period;

  const [kpis, pipeline, jobTypes, allJobs, suburbs, errorRuns] = await Promise.all([
    getJobsKpis(window),
    getPipeline(),
    getJobTypes(window),
    getAllJobs(window, 60),
    getSuburbDistribution(),
    getActiveErrors(),
  ]);

  return (
    <>
      <TopBar syncErrors={errorRuns.length} />
      <Suspense>
        <SubBar title="Jobs" crumb={`Dashboard · Jobs · ${label}`} />
      </Suspense>
      <div className="page">
        <JobsKpiStrip k={kpis} windowLabel={label} />
        <JobPipelineKanban stages={pipeline} />
        <JobMap suburbs={suburbs} />
        <JobTypesTable rows={jobTypes} />
        <DurationValueScatter />
        <AllJobsTable rows={allJobs} />
        <PageFooter />
      </div>
    </>
  );
}
