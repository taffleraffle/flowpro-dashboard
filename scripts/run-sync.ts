// Manual sync runner — used for local dev or one-off backfills.
// Usage: npm run sync:simpro  |  npm run sync:whatconverts  |  npm run sync:all
import 'dotenv/config';
import { withSyncRun } from '../src/lib/sync-run';
import { syncSimproCustomers, syncSimproJobs, syncSimproQuotes } from '../src/lib/sync-simpro';
import { syncWhatConverts } from '../src/lib/sync-whatconverts';

async function main() {
  const target = process.argv[2] ?? 'all';
  if (target === 'simpro' || target === 'all') {
    const r = await withSyncRun('simpro', async () => {
      const c = await syncSimproCustomers();
      const q = await syncSimproQuotes();
      const j = await syncSimproJobs();
      return { rowsUpserted: c.rowsUpserted + q.rowsUpserted + j.rowsUpserted, details: { customers: c.rowsUpserted, quotes: q.rowsUpserted, jobs: j.rowsUpserted } };
    });
    console.log('SimPro sync ok:', r);
  }
  if (target === 'whatconverts' || target === 'all') {
    const r = await withSyncRun('whatconverts', async () => syncWhatConverts());
    console.log('WhatConverts sync ok:', r);
  }
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
