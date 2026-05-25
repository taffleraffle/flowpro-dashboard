// WhatConverts → SimPro bridge.
//
// Goal: for every WC lead, find which SimPro customer/job it became, so the
// dashboard can show real lead→cash conversion (not just lead count).
//
// Matching strategy — cheap fields first, in priority order:
//   1. Normalized phone (NZ format: strip +64, leading 0, spaces, dashes)
//   2. Lowercased email
//   3. Same-day name match (last resort, soft confidence)
//
// We rebuild the full bridge table on each SimPro sync (~few seconds for
// 17k jobs × 2.3k leads). Cheap, deterministic, and avoids drift from
// incremental matching.
import { getServerSupabase } from './supabase';

type LeadKey = {
  lead_id: number;
  phone: string | null;
  email: string | null;
};

type CustomerKey = {
  id: number;
  phone: string | null;
  email: string | null;
};

type JobKey = {
  id: number;
  customer_id: number | null;
  total_ex_tax: number | null;
  date_completed: string | null;
};

// NZ phone match key — last 8 digits of the raw number after stripping non-
// digits. This unifies all the variants we see in the wild:
//   "+64 21 234 5678", "021 234 5678", "0212345678", "21 234 5678",
//   "021 575520 - James Ormond" (SimPro lets people append notes)
// All collapse to the same 8-digit suffix. 8 digits is the right cut: NZ
// numbers minus country code + trunk 0 are 8-9 digits; an 8-digit suffix is
// unique in practice and survives whatever prefix scheme either side uses.
function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.slice(-8);
}

function normaliseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const e = raw.trim().toLowerCase();
  return e.includes('@') ? e : null;
}

// Page through a Supabase table — the default 1000-row limit silently
// truncates aggregations otherwise.
async function fetchAll<T>(
  sb: ReturnType<typeof getServerSupabase>,
  table: string,
  cols: string,
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from(table)
      .select(cols)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as unknown as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function rebuildWcSimproMatches(): Promise<{ matchedCount: number; totalLeads: number }> {
  const sb = getServerSupabase();

  // Pull everything we need to do the matching in memory. 1k customers,
  // 17k jobs, 2.3k leads = trivial RAM cost.
  // Pull raw.Phone for customers (the `phone` column is often empty for
  // historical customers and contains junk like "021 575520 - James Ormond"
  // when populated; raw is the source of truth).
  const customersRaw = await fetchAll<{ id: number; email: string | null; raw: Record<string, unknown> }>(
    sb,
    'simpro_customers',
    'id, email, raw',
  );
  const customers = customersRaw.map(c => ({
    id: c.id,
    phone: typeof c.raw?.Phone === 'string' ? c.raw.Phone : null,
    email: c.email,
  }));

  const jobs = await fetchAll<{
    id: number;
    customer_id: number | null;
    total_ex_tax: number | null;
    date_completed: string | null;
  }>(sb, 'simpro_jobs', 'id, customer_id, total_ex_tax, date_completed');

  // Use raw.caller_number (the actual customer phone) — caller_phone column
  // was pre-trimmed to last-9-digits which doesn't survive country-code
  // alignment. raw has the full +64... we can normalise consistently.
  const leadsRaw = await fetchAll<{ id: number; caller_email: string | null; raw: Record<string, unknown> }>(
    sb,
    'wc_leads',
    'id, caller_email, raw',
  );
  const leads = leadsRaw.map(l => ({
    id: l.id,
    caller_phone:
      (typeof l.raw?.caller_number === 'string' && l.raw.caller_number) ||
      (typeof l.raw?.contact_phone_number === 'string' && l.raw.contact_phone_number) ||
      null,
    caller_email: l.caller_email,
  }));

  // Build lookup indexes
  const customerByPhone = new Map<string, CustomerKey>();
  const customerByEmail = new Map<string, CustomerKey>();
  for (const c of customers) {
    const p = normalisePhone(c.phone);
    const e = normaliseEmail(c.email);
    if (p && !customerByPhone.has(p)) customerByPhone.set(p, { id: c.id, phone: p, email: e });
    if (e && !customerByEmail.has(e)) customerByEmail.set(e, { id: c.id, phone: p, email: e });
  }

  // Group jobs by customer_id for downstream aggregation
  const jobsByCustomer = new Map<number, JobKey[]>();
  for (const j of jobs) {
    if (j.customer_id == null) continue;
    const arr = jobsByCustomer.get(j.customer_id) ?? [];
    arr.push(j);
    jobsByCustomer.set(j.customer_id, arr);
  }
  // Sort each customer's jobs by completion date (asc) so [0] = first job
  for (const arr of jobsByCustomer.values()) {
    arr.sort((a, b) => (a.date_completed ?? '').localeCompare(b.date_completed ?? ''));
  }

  // Match each lead
  type MatchRow = {
    lead_id: number;
    customer_id: number | null;
    first_job_id: number | null;
    first_job_date: string | null;
    job_revenue: number;
    job_count: number;
    match_method: 'phone' | 'email' | 'phone+email' | null;
    confidence: number;
  };
  const matches: MatchRow[] = [];
  let matched = 0;
  for (const lead of leads) {
    const p = normalisePhone(lead.caller_phone as LeadKey['phone']);
    const e = normaliseEmail(lead.caller_email as LeadKey['email']);
    const byP = p ? customerByPhone.get(p) : undefined;
    const byE = e ? customerByEmail.get(e) : undefined;

    let customer: CustomerKey | undefined;
    let method: MatchRow['match_method'] = null;
    let confidence = 0;
    if (byP && byE && byP.id === byE.id) {
      customer = byP;
      method = 'phone+email';
      confidence = 1;
    } else if (byP) {
      customer = byP;
      method = 'phone';
      confidence = 0.9;
    } else if (byE) {
      customer = byE;
      method = 'email';
      confidence = 0.75;
    }

    if (!customer) {
      matches.push({
        lead_id: lead.id,
        customer_id: null,
        first_job_id: null,
        first_job_date: null,
        job_revenue: 0,
        job_count: 0,
        match_method: null,
        confidence: 0,
      });
      continue;
    }

    const customerJobs = jobsByCustomer.get(customer.id) ?? [];
    const totalRevenue = customerJobs.reduce((s, j) => s + (Number(j.total_ex_tax) || 0), 0);
    const firstJob = customerJobs[0];
    matches.push({
      lead_id: lead.id,
      customer_id: customer.id,
      first_job_id: firstJob?.id ?? null,
      first_job_date: firstJob?.date_completed ?? null,
      job_revenue: totalRevenue,
      job_count: customerJobs.length,
      match_method: method,
      confidence,
    });
    matched++;
  }

  // Truncate-and-replace pattern. Simpler than upsert and safe because the
  // bridge has no dependents — it's strictly read-only downstream.
  // Delete via service role bypasses RLS.
  const { error: delErr } = await sb.from('wc_simpro_matches').delete().neq('lead_id', -1);
  if (delErr) throw new Error(`wc_simpro_matches delete failed: ${delErr.message}`);

  // Chunked insert to dodge any payload-size limit
  const CHUNK = 1000;
  for (let i = 0; i < matches.length; i += CHUNK) {
    const slice = matches.slice(i, i + CHUNK);
    const { error } = await sb.from('wc_simpro_matches').insert(slice);
    if (error) throw new Error(`wc_simpro_matches insert failed: ${error.message}`);
  }

  return { matchedCount: matched, totalLeads: leads.length };
}
