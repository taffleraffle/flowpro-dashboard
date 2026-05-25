import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side client (service-role key — full table access).
// Never import this from a client component.
let serverClient: SupabaseClient | null = null;
export function getServerSupabase(): SupabaseClient {
  if (serverClient) return serverClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  serverClient = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // Next.js 14 caches fetch() responses by default. Without this opt-out,
      // supabase-js queries return stale data from before inserts ran in the
      // same dev process. force-dynamic on the route disables full-route caching
      // but NOT the underlying fetch cache — those are separate layers.
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });
  return serverClient;
}

// Browser-readable client (anon key, RLS-bound).
let browserClient: SupabaseClient | null = null;
export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }
  browserClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return browserClient;
}
