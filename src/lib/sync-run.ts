import { getServerSupabase } from './supabase';

export type SyncSource = 'simpro' | 'whatconverts' | 'google_ads' | 'meta_ads' | 'geocode';

export async function startSyncRun(source: SyncSource): Promise<number> {
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('sync_runs')
    .insert({ source, status: 'running' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function finishSyncRun(
  id: number,
  result: { status: 'ok' | 'error'; rows?: number; error?: string; details?: Record<string, unknown> },
): Promise<void> {
  const sb = getServerSupabase();
  const { error } = await sb
    .from('sync_runs')
    .update({
      finished_at: new Date().toISOString(),
      status: result.status,
      rows_upserted: result.rows ?? 0,
      error_message: result.error ?? null,
      details: result.details ?? {},
    })
    .eq('id', id);
  if (error) {
    // Surface, don't swallow — otherwise sync_runs rows get stuck in 'running'
    // forever and the UI shows phantom in-flight jobs.
    throw new Error(`finishSyncRun(${id}) failed: ${error.message}`);
  }
}

// Wrap a sync function with start/finish logging.
// Errors are surfaced (not swallowed) — they bubble up so the caller's HTTP
// handler returns 500 and the sync_runs row records the failure.
export async function withSyncRun<T extends { rowsUpserted?: number; details?: Record<string, unknown> }>(
  source: SyncSource,
  fn: () => Promise<T>,
): Promise<T> {
  const id = await startSyncRun(source);
  try {
    const result = await fn();
    await finishSyncRun(id, { status: 'ok', rows: result.rowsUpserted, details: result.details });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishSyncRun(id, { status: 'error', error: message });
    throw err;
  }
}
