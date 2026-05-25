import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withSyncRun, type SyncSource } from '@/lib/sync-run';
import {
  syncSimproCustomers,
  syncSimproJobs,
  syncSimproQuotes,
  syncSimproStaff,
  syncSimproSchedules,
} from '@/lib/sync-simpro';
import { syncWhatConverts } from '@/lib/sync-whatconverts';
import { rebuildWcSimproMatches } from '@/lib/wc-simpro-bridge';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — long enough for full historical sync

const VALID_SOURCES: SyncSource[] = ['simpro', 'whatconverts', 'google_ads', 'meta_ads'];

function authorized(req: NextRequest): boolean {
  // Require CRON_SECRET in every environment. Local dev: set CRON_SECRET=dev in .env.local.
  // Vercel Cron sends `Authorization: Bearer <secret>` — we never accept the secret
  // via query string (logged by Vercel/CDNs/Referer headers).
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function POST(req: NextRequest, { params }: { params: { source: string } }) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }
  const source = params.source as SyncSource;
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json({ success: false, error: `unknown source: ${source}` }, { status: 400 });
  }

  try {
    const result = await runSync(source);
    // Bust the cached aggregates so the dashboard reflects the new data
    // on the very next request (no 60s wait).
    revalidateTag('dashboard');
    revalidateTag('marketing');
    revalidateTag('sync_runs');
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    // Even on error, sync_runs got a new row — refresh that cache so the
    // bell badge + error banner pick it up immediately.
    revalidateTag('sync_runs');
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET mirrors POST so Vercel Cron (which only sends GET) can trigger it.
export async function GET(req: NextRequest, ctx: { params: { source: string } }) {
  return POST(req, ctx);
}

async function runSync(source: SyncSource) {
  switch (source) {
    case 'simpro':
      return withSyncRun('simpro', async () => {
        const customers = await syncSimproCustomers();
        const quotes = await syncSimproQuotes();
        const jobs = await syncSimproJobs();
        const staff = await syncSimproStaff();
        // 12-month schedule window — long enough for utilisation trends, short
        // enough to keep the row count under ~50k.
        const schedules = await syncSimproSchedules({ months: 12 });
        // Rebuild lead→job matches after both sides are fresh.
        const matches = await rebuildWcSimproMatches();
        return {
          rowsUpserted:
            customers.rowsUpserted +
            quotes.rowsUpserted +
            jobs.rowsUpserted +
            staff.rowsUpserted +
            schedules.rowsUpserted,
          details: {
            customers: customers.rowsUpserted,
            quotes: quotes.rowsUpserted,
            jobs: jobs.rowsUpserted,
            staff: staff.rowsUpserted,
            schedules: schedules.rowsUpserted,
            wc_simpro_matches: matches.matchedCount,
          },
        };
      });
    case 'whatconverts':
      return withSyncRun('whatconverts', async () => {
        const result = await syncWhatConverts();
        return { rowsUpserted: result.rowsUpserted, details: result.details };
      });
    case 'google_ads':
      return withSyncRun('google_ads', async () => {
        throw new Error('google_ads sync not implemented yet — paste GOOGLE_ADS_* env vars and wire src/lib/sync-google-ads.ts');
      });
    case 'meta_ads':
      return withSyncRun('meta_ads', async () => {
        throw new Error('meta_ads sync not implemented yet — paste META_AD_ACCOUNT_ID + META_ACCESS_TOKEN env vars and wire src/lib/sync-meta-ads.ts');
      });
    default:
      throw new Error(`unhandled source ${source}`);
  }
}
