import { getServerSupabase } from './supabase';
import { fetchLeads, getProfileIds, type WCLeadRow } from './whatconverts';

const BATCH_SIZE = 500;

export async function syncWhatConverts(opts: { startDate?: string; endDate?: string } = {}): Promise<{ rowsUpserted: number; details: Record<string, number> }> {
  const sb = getServerSupabase();
  const profileIds = getProfileIds();
  const details: Record<string, number> = {};
  let buffer: ReturnType<typeof mapLead>[] = [];
  let total = 0;

  // Default to a 12-month backfill so first sync grabs full history.
  // Incremental syncs (cron) can pass a tighter window.
  const endDate = opts.endDate ?? new Date().toISOString().slice(0, 10);
  const startDate = opts.startDate ?? new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);

  for (const profileId of profileIds) {
    let profileTotal = 0;
    for await (const lead of fetchLeads({ profileId, startDate, endDate })) {
      buffer.push(mapLead(lead));
      profileTotal += 1;
      if (buffer.length >= BATCH_SIZE) {
        await flush(sb, buffer);
        total += buffer.length;
        buffer = [];
      }
    }
    details[`profile_${profileId}`] = profileTotal;
  }

  if (buffer.length) {
    await flush(sb, buffer);
    total += buffer.length;
  }

  // After upserting raw leads, run the SimPro match join so attribution lights up.
  const matched = await matchLeadsToSimproCustomers();
  details['matched_to_simpro'] = matched;

  return { rowsUpserted: total, details };
}

async function flush(sb: ReturnType<typeof getServerSupabase>, rows: unknown[]) {
  const { error } = await sb.from('wc_leads').upsert(rows as Record<string, unknown>[], { onConflict: 'id' });
  if (error) throw new Error(`Supabase upsert wc_leads failed: ${error.message}`);
}

function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  const digits = String(p).replace(/\D/g, '');
  // Last 9 digits — handles NZ +64 vs 0 prefix mismatch between SimPro and WC.
  // Anything shorter than 9 digits is junk (extension-only / typo) — return null
  // so it doesn't get false-matched against a real customer.
  return digits.length >= 9 ? digits.slice(-9) : null;
}

function mapLead(r: WCLeadRow) {
  const quotable =
    typeof r.quotable === 'boolean' ? r.quotable : typeof r.quotable === 'string' ? r.quotable.toLowerCase() === 'yes' : null;
  return {
    id: r.lead_id,
    profile_id: r.profile_id,
    profile_name: r.profile ?? null,
    lead_type: r.lead_type ?? null,
    lead_status: r.lead_status ?? null,
    quotable,
    quote_value: r.quote_value ?? null,
    sales_value: r.sales_value ?? null,
    date_created: r.date_created ?? null,
    caller_name: r.contact_name ?? null,
    caller_phone: normalizePhone(r.contact_phone_number),
    caller_email: r.contact_email_address ?? null,
    caller_country: r.contact_country ?? null,
    lead_source: r.lead_source ?? null,
    lead_medium: r.lead_medium ?? null,
    lead_campaign: r.lead_campaign ?? null,
    lead_keyword: r.lead_keywords ?? null,
    gclid: r.gclid ?? null,
    msclkid: r.msclkid ?? null,
    fbclid: r.fbclid ?? null,
    utm_source: r.utm_source ?? null,
    utm_medium: r.utm_medium ?? null,
    utm_campaign: r.utm_campaign ?? null,
    utm_term: r.utm_term ?? null,
    utm_content: r.utm_content ?? null,
    raw: r as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}

// Join WC leads to SimPro customers by normalized phone and email.
// Runs after every WC sync so attribution stays fresh.
async function matchLeadsToSimproCustomers(): Promise<number> {
  const sb = getServerSupabase();
  // Phone match (last 9 digits)
  const { data: phoneMatches, error: phoneErr } = await sb.rpc('match_wc_leads_to_simpro', {});
  if (phoneErr) {
    // RPC may not exist yet on a fresh DB — fall back to noop, surface in logs.
    if (phoneErr.message.includes('does not exist')) return 0;
    throw new Error(`match_wc_leads_to_simpro RPC failed: ${phoneErr.message}`);
  }
  return Number(phoneMatches ?? 0);
}
