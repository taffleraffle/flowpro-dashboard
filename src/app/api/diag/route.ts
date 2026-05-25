import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Per-function diagnostic — surfaces which env vars are present on
// the server, which Supabase queries fail, and the exact error
// message for each. Use this on Render where we can't tail logs.
//
// GET /api/diag → JSON
//
// No secrets returned — env-var values are reported as { present, length }
// only, never the value itself.

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SIMPRO_TENANT',
  'SIMPRO_CLIENT_ID',
  'SIMPRO_CLIENT_SECRET',
  'SIMPRO_USERNAME',
  'SIMPRO_PASSWORD',
  'SIMPRO_ACCESS_TOKEN',
  'SIMPRO_COMPANY_ID',
  'WC_API_TOKEN',
  'WC_API_SECRET',
  'WC_PROFILE_IDS',
  'OFFICE_ADDRESS',
  'OFFICE_LAT',
  'OFFICE_LNG',
  'CRON_SECRET',
];

async function tryStep<T>(name: string, fn: () => Promise<T>): Promise<{ name: string; ok: boolean; ms: number; error?: string; sample?: any }> {
  const t0 = Date.now();
  try {
    const v = await fn();
    return { name, ok: true, ms: Date.now() - t0, sample: v };
  } catch (e: any) {
    return { name, ok: false, ms: Date.now() - t0, error: e?.message ?? String(e) };
  }
}

export async function GET() {
  const env: Record<string, { present: boolean; length: number }> = {};
  for (const k of ENV_KEYS) {
    const v = process.env[k];
    env[k] = { present: !!(v && v.trim()), length: v?.length ?? 0 };
  }

  // Now actually exercise each metric step. We require the supabase
  // module dynamically so a top-level throw shows up here rather than
  // crashing the route.
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const win = { startDate: monthAgo, endDate: today };

  const steps: any[] = [];

  // Step: supabase client init
  let sb: any = null;
  steps.push(await tryStep('supabase-init', async () => {
    const mod = await import('@/lib/supabase');
    sb = mod.getServerSupabase();
    return { url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '') ?? null };
  }));

  if (sb) {
    // Step: each table the dashboard reads from. select 1 row to keep
    // payload tiny but exercise the same code path.
    const tables = ['wc_leads', 'simpro_jobs', 'simpro_quotes', 'simpro_customers', 'sync_runs', 'ads_spend_daily', 'wc_simpro_matches'];
    for (const t of tables) {
      steps.push(await tryStep(`table:${t}`, async () => {
        const { data, error, count } = await sb.from(t).select('*', { count: 'exact', head: false }).limit(1);
        if (error) throw new Error(error.message);
        return { rows: data?.length ?? 0, count };
      }));
    }
  }

  // Step: each top-level metric used by app/page.tsx
  const metricFns: { name: string; load: () => Promise<any> }[] = [
    { name: 'getOverviewKpis',     load: () => import('@/lib/metrics').then(m => m.getOverviewKpis(win)) },
    { name: 'getDailySeries',      load: () => import('@/lib/metrics').then(m => m.getDailySeries(win)) },
    { name: 'getAcquisition',      load: () => import('@/lib/metrics').then(m => m.getAcquisition(win)) },
    { name: 'getFunnel',           load: () => import('@/lib/metrics').then(m => m.getFunnel(win)) },
    { name: 'getServiceCategories',load: () => import('@/lib/metrics').then(m => m.getServiceCategories(win)) },
    { name: 'getRecentSyncRuns',   load: () => import('@/lib/metrics').then(m => m.getRecentSyncRuns(8)) },
    { name: 'getActiveErrors',     load: () => import('@/lib/metrics').then(m => m.getActiveErrors()) },
    { name: 'getSuburbDistribution', load: () => import('@/lib/suburbs').then(m => m.getSuburbDistribution()) },
  ];

  for (const m of metricFns) {
    steps.push(await tryStep(m.name, async () => {
      const r: any = await m.load();
      // Don't dump entire payload — just a shape hint.
      if (Array.isArray(r)) return { kind: 'array', length: r.length };
      if (r && typeof r === 'object') return { kind: 'object', keys: Object.keys(r).slice(0, 12) };
      return { kind: typeof r };
    }));
  }

  const failures = steps.filter(s => !s.ok);

  return NextResponse.json({
    summary: {
      total: steps.length,
      ok: steps.length - failures.length,
      failed: failures.length,
      first_failure: failures[0]?.name ?? null,
      first_failure_message: failures[0]?.error ?? null,
    },
    env,
    steps,
  }, { headers: { 'cache-control': 'no-store' } });
}
