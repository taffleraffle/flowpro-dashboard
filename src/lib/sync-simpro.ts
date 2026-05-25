import { getServerSupabase } from './supabase';
import {
  fetchCustomers,
  fetchJobs,
  fetchQuotes,
  fetchStaff,
  fetchSchedules,
  type SimproCustomerRow,
  type SimproJobRow,
  type SimproQuoteRow,
  type SimproStaffRow,
  type SimproScheduleRow,
} from './simpro';
import { getOfficeOrigin, haversineKm } from './distance';

const BATCH_SIZE = 500;

function statusName(s: SimproJobRow['Status'] | SimproQuoteRow['Status']): string | null {
  if (!s) return null;
  return typeof s === 'string' ? s : s.Name ?? null;
}

// SimPro returns "" for unset dates (e.g. DateApproved on an open quote).
// Postgres rejects empty strings on a date column — coerce to null.
function nullableDate(v: string | undefined | null): string | null {
  if (!v) return null;
  const trimmed = String(v).trim();
  return trimmed === '' ? null : trimmed;
}

// SimPro `Stage` is the authoritative completion signal. Values seen in
// the wild: "Progress" (open), "Complete" (done), "Pending", "Archived".
// CompletedDate is also set on completed jobs — belt-and-braces.
function isJobComplete(row: SimproJobRow): boolean {
  const stage = typeof row.Stage === 'string' ? row.Stage.toLowerCase() : '';
  if (stage === 'complete') return true;
  if (row.CompletedDate) return true;
  // Status name fallback for older records
  const name = statusName(row.Status)?.toLowerCase() ?? '';
  return name.includes('complete') || name.includes('invoiced') || name.includes('finished');
}

export async function syncSimproCustomers(modifiedSince?: string): Promise<{ rowsUpserted: number }> {
  const sb = getServerSupabase();
  let buffer: ReturnType<typeof mapCustomer>[] = [];
  let total = 0;

  for await (const row of fetchCustomers(modifiedSince)) {
    buffer.push(mapCustomer(row));
    if (buffer.length >= BATCH_SIZE) {
      await flush(sb, 'simpro_customers', buffer);
      total += buffer.length;
      buffer = [];
    }
  }
  if (buffer.length) {
    await flush(sb, 'simpro_customers', buffer);
    total += buffer.length;
  }
  return { rowsUpserted: total };
}

export async function syncSimproQuotes(modifiedSince?: string): Promise<{ rowsUpserted: number }> {
  const sb = getServerSupabase();
  let buffer: ReturnType<typeof mapQuote>[] = [];
  let total = 0;

  for await (const row of fetchQuotes(modifiedSince)) {
    buffer.push(mapQuote(row));
    if (buffer.length >= BATCH_SIZE) {
      await flush(sb, 'simpro_quotes', buffer);
      total += buffer.length;
      buffer = [];
    }
  }
  if (buffer.length) {
    await flush(sb, 'simpro_quotes', buffer);
    total += buffer.length;
  }
  return { rowsUpserted: total };
}

export async function syncSimproJobs(modifiedSince?: string): Promise<{ rowsUpserted: number }> {
  const sb = getServerSupabase();
  const office = getOfficeOrigin();
  let buffer: ReturnType<typeof mapJob>[] = [];
  let total = 0;

  for await (const row of fetchJobs(modifiedSince)) {
    const mapped = mapJob(row);
    // Distance is computed on sync if we have site coords; otherwise null
    // and a separate geocode pass will fill it later.
    if (mapped.site_lat != null && mapped.site_lng != null) {
      mapped.distance_km = Number(haversineKm(office.lat, office.lng, mapped.site_lat, mapped.site_lng).toFixed(2));
    }
    buffer.push(mapped);
    if (buffer.length >= BATCH_SIZE) {
      await flush(sb, 'simpro_jobs', buffer);
      total += buffer.length;
      buffer = [];
    }
  }
  if (buffer.length) {
    await flush(sb, 'simpro_jobs', buffer);
    total += buffer.length;
  }
  return { rowsUpserted: total };
}

async function flush(sb: ReturnType<typeof getServerSupabase>, table: string, rows: unknown[]) {
  const { error } = await sb.from(table).upsert(rows as Record<string, unknown>[], { onConflict: 'id' });
  if (error) throw new Error(`Supabase upsert ${table} failed: ${error.message}`);
}

function mapCustomer(r: SimproCustomerRow) {
  return {
    id: r.ID,
    company_name: r.CompanyName ?? null,
    given_name: r.GivenName ?? null,
    family_name: r.FamilyName ?? null,
    email: r.Email ?? null,
    phone: r.Phone ?? null,
    address_line1: r.Address?.Line1 ?? null,
    address_city: r.Address?.City ?? null,
    address_postcode: r.Address?.PostalCode ?? null,
    address_country: r.Address?.Country ?? null,
    raw: r as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}

function mapQuote(r: SimproQuoteRow) {
  // SimPro quotes don't return a Status object reliably; Stage is more useful.
  const stage = (r as unknown as { Stage?: string }).Stage ?? null;
  const isClosed = Boolean((r as unknown as { IsClosed?: boolean }).IsClosed);
  return {
    id: r.ID,
    customer_id: r.Customer?.ID ?? null,
    status: stage ?? statusName(r.Status),
    total_ex_tax: r.Total?.ExTax ?? null,
    total_inc_tax: r.Total?.IncTax ?? null,
    date_issued: nullableDate(r.DateIssued),
    date_approved: nullableDate(r.DateApproved),
    is_approved: isClosed || Boolean(r.IsApproved),
    raw: r as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}

function mapJob(r: SimproJobRow) {
  // List endpoint returns Site as {ID, Name} only — detailed Address is
  // available on the per-job detail endpoint but we skip that to avoid
  // 16,890 extra HTTP calls. Site.Name is usually a readable street + suburb.
  const site = r.Site as unknown as { Name?: string; Address?: { Line1?: string; City?: string; PostalCode?: string; Country?: string } } | undefined;
  const addrObj = site?.Address;
  const site_address = addrObj
    ? [addrObj.Line1, addrObj.City, addrObj.PostalCode, addrObj.Country].filter(Boolean).join(', ')
    : (site?.Name ?? null);

  // Cost / profit from Totals — prefer Actual, fall back to Estimate for jobs
  // that haven't reached final cost. Materials + Labor are the two big buckets.
  const t = r.Totals;
  const pick = (n?: { Actual?: number; Estimate?: number }): number | null => {
    if (!n) return null;
    const v = n.Actual ?? n.Estimate;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  const materialsCost = pick(t?.MaterialsCost);
  const laborCost = pick(t?.ResourcesCost?.Labor);
  const laborHours = pick(t?.ResourcesCost?.LaborHours);
  const totalResourcesCost = pick(t?.ResourcesCost?.Total);
  // SimPro's "cost ex tax" = Materials + Resources (labor + plant + overhead).
  const cost_ex_tax =
    materialsCost != null || totalResourcesCost != null
      ? (materialsCost ?? 0) + (totalResourcesCost ?? 0)
      : null;
  const gross_profit = pick(t?.GrossProfitLoss);
  const gross_margin = pick(t?.GrossMargin);
  const nett_profit = pick(t?.NettProfitLoss);

  return {
    id: r.ID,
    customer_id: r.Customer?.ID ?? null,
    quote_id: r.Quote?.ID ?? null,
    status: statusName(r.Status),
    total_ex_tax: r.Total?.ExTax ?? null,
    total_inc_tax: r.Total?.IncTax ?? null,
    cost_ex_tax,
    gross_profit,
    gross_margin,
    nett_profit,
    materials_cost: materialsCost,
    labor_cost: laborCost,
    labor_hours: laborHours,
    date_created: nullableDate(r.DateIssued),
    // SimPro uses `CompletedDate` on jobs (not `DateCompleted` like the swagger suggests).
    date_completed: nullableDate((r as unknown as { CompletedDate?: string }).CompletedDate),
    is_complete: isJobComplete(r),
    site_address,
    site_lat: null as number | null,
    site_lng: null as number | null,
    distance_km: null as number | null,
    raw: r as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}

// ============================================================
// Staff sync — pulls people + equipment, mapped flat
// ============================================================
export async function syncSimproStaff(): Promise<{ rowsUpserted: number }> {
  const sb = getServerSupabase();
  let buffer: ReturnType<typeof mapStaff>[] = [];
  let total = 0;
  for await (const row of fetchStaff()) {
    buffer.push(mapStaff(row));
    if (buffer.length >= BATCH_SIZE) {
      await flush(sb, 'simpro_staff', buffer);
      total += buffer.length;
      buffer = [];
    }
  }
  if (buffer.length) {
    await flush(sb, 'simpro_staff', buffer);
    total += buffer.length;
  }
  return { rowsUpserted: total };
}

function mapStaff(r: SimproStaffRow) {
  return {
    id: r.ID,
    name: r.Name ?? `Staff ${r.ID}`,
    type: r.Type ?? null,
    type_id: r.TypeId ?? null,
    email: r.Email ?? null,
    phone: r.Phone ?? null,
    raw: r as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}

// ============================================================
// Schedules sync — trailing window only (12 months by default).
// Each block becomes one row in simpro_schedules.
// ============================================================
export async function syncSimproSchedules(
  opts: { months?: number } = {},
): Promise<{ rowsUpserted: number }> {
  const sb = getServerSupabase();
  const months = opts.months ?? 12;
  const from = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  let buffer: ReturnType<typeof mapSchedule>[] = [];
  let total = 0;
  for await (const row of fetchSchedules({ from })) {
    buffer.push(mapSchedule(row));
    if (buffer.length >= BATCH_SIZE) {
      await flush(sb, 'simpro_schedules', buffer);
      total += buffer.length;
      buffer = [];
    }
  }
  if (buffer.length) {
    await flush(sb, 'simpro_schedules', buffer);
    total += buffer.length;
  }
  return { rowsUpserted: total };
}

function mapSchedule(r: SimproScheduleRow) {
  // Reference is the linked Job ID (when Type === 'job'). It's a string in
  // the API response — coerce to bigint, null when not a job link.
  let job_id: number | null = null;
  if (r.Reference && r.Type === 'job') {
    const n = Number(r.Reference);
    job_id = Number.isFinite(n) ? n : null;
  }
  const firstBlock = r.Blocks?.[0];
  return {
    id: r.ID,
    staff_id: r.Staff?.ID ?? null,
    staff_name: r.Staff?.Name ?? null,
    job_id,
    schedule_type: r.Type ?? null,
    date: r.Date ?? null,
    total_hours: r.TotalHours ?? null,
    rate_name: firstBlock?.ScheduleRate?.Name ?? null,
    raw: r as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}
