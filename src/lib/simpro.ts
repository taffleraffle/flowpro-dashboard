// SimPro API client — OAuth2 Resource Owner Password Credentials grant.
//
// Flow:
//   1. POST /oauth2/token with grant_type=password + client_id + secret + username + password
//   2. Cache the returned access_token (expires_in seconds, typically 3600)
//   3. Use Authorization: Bearer <access_token> on every /api/v1.0/... request
//   4. On 401, refresh once and retry. On expiry, do a fresh password grant.
//
// Docs: https://developer.simprogroup.com/apidoc/?page=3366d2ea7906f693b27d57ed9cca3acb

type SimproEnv = {
  tenant: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  companyId: string;
};

function env(): SimproEnv {
  const tenant = process.env.SIMPRO_TENANT;
  const clientId = process.env.SIMPRO_CLIENT_ID;
  const clientSecret = process.env.SIMPRO_CLIENT_SECRET;
  const username = process.env.SIMPRO_USERNAME;
  const password = process.env.SIMPRO_PASSWORD;
  const companyId = process.env.SIMPRO_COMPANY_ID ?? '0';
  if (!tenant) throw new Error('SIMPRO_TENANT missing (subdomain only, e.g. "flowproltd")');
  if (!clientId) throw new Error('SIMPRO_CLIENT_ID missing');
  if (!clientSecret) throw new Error('SIMPRO_CLIENT_SECRET missing');
  if (!username) throw new Error('SIMPRO_USERNAME missing');
  if (!password) throw new Error('SIMPRO_PASSWORD missing');
  return { tenant, clientId, clientSecret, username, password, companyId };
}

function baseUrl(): string {
  return `https://${env().tenant}.simprosuite.com`;
}

// ============================================================
// Token cache — process-scoped. SimPro access tokens last 1 hour;
// we refresh 60 seconds before expiry to avoid mid-flight expiration.
// ============================================================
type CachedToken = { accessToken: string; refreshToken: string | null; expiresAt: number };
let cached: CachedToken | null = null;
let inFlight: Promise<CachedToken> | null = null;

async function fetchToken(): Promise<CachedToken> {
  const e = env();
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: e.clientId,
    client_secret: e.clientSecret,
    username: e.username,
    password: e.password,
  });
  const res = await fetch(`${baseUrl()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SimPro OAuth ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000, // refresh 60s before real expiry
  };
}

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;
  // Coalesce concurrent fetches so we don't burn through SimPro's auth rate limit
  // when 5 syncs fire at once.
  if (inFlight) return (await inFlight).accessToken;
  inFlight = fetchToken();
  try {
    cached = await inFlight;
    return cached.accessToken;
  } finally {
    inFlight = null;
  }
}

// ============================================================
// HTTP helper with automatic 401 retry (token rotated mid-flight).
// ============================================================
type FetchOpts = { searchParams?: Record<string, string | number | undefined>; signal?: AbortSignal };

async function simproFetch<T>(
  path: string,
  opts: FetchOpts = {},
): Promise<{ data: T; nextPage: number | null; total: number | null }> {
  const url = new URL(baseUrl() + path);
  if (opts.searchParams) {
    for (const [k, v] of Object.entries(opts.searchParams)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const doFetch = async (token: string) =>
    fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: opts.signal,
      cache: 'no-store',
    });

  let token = await getToken();
  let res = await doFetch(token);

  // 401 = token expired or rotated. Bust the cache and try once more.
  if (res.status === 401) {
    cached = null;
    token = await getToken();
    res = await doFetch(token);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SimPro ${res.status} ${res.statusText} on ${path}: ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as T;
  const total = Number(res.headers.get('Result-Total') ?? '') || null;
  const link = res.headers.get('Link') ?? '';
  const nextMatch = link.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="next"/);
  const nextPage = nextMatch ? Number(nextMatch[1]) : null;
  return { data, nextPage, total };
}

async function* paginate<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): AsyncGenerator<T> {
  let page = 1;
  const HARD_CAP = 500;
  while (page <= HARD_CAP) {
    const { data, nextPage } = await simproFetch<T[]>(path, {
      searchParams: { ...params, page, pageSize: 250 },
    });
    if (!Array.isArray(data) || data.length === 0) return;
    for (const row of data) yield row;
    if (!nextPage || nextPage <= page) return;
    page = nextPage;
  }
}

// ============================================================
// Resource types (loose — full payload kept in `raw` jsonb)
// ============================================================
export type SimproCustomerRow = {
  ID: number;
  Type?: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  Email?: string;
  Phone?: string;
  Address?: { Line1?: string; City?: string; PostalCode?: string; Country?: string };
};

export type SimproQuoteRow = {
  ID: number;
  Customer?: { ID?: number };
  Status?: { Name?: string } | string;
  Total?: { ExTax?: number; IncTax?: number };
  DateIssued?: string;
  DateApproved?: string;
  IsApproved?: boolean;
};

export type SimproJobRow = {
  ID: number;
  Customer?: { ID?: number; CompanyName?: string; GivenName?: string; FamilyName?: string };
  Quote?: { ID?: number };
  Status?: { ID?: number; Name?: string; Color?: string } | string;
  Total?: { ExTax?: number; IncTax?: number; Tax?: number };
  // SimPro `Totals` (plural) holds cost/margin. All values have Actual/Estimate/Revised
  // variants — we use Actual for completed jobs (real), Estimate as fallback.
  Totals?: {
    MaterialsCost?: { Actual?: number; Estimate?: number };
    ResourcesCost?: {
      Total?: { Actual?: number; Estimate?: number };
      Labor?: { Actual?: number; Estimate?: number };
      LaborHours?: { Actual?: number; Estimate?: number };
    };
    GrossProfitLoss?: { Actual?: number; Estimate?: number };
    GrossMargin?: { Actual?: number; Estimate?: number };
    NettProfitLoss?: { Actual?: number; Estimate?: number };
  };
  DateIssued?: string;
  CompletedDate?: string;
  Stage?: string;
  Type?: string;
  Site?: { ID?: number; Name?: string; Address?: { Line1?: string; City?: string; PostalCode?: string; Country?: string } };
  Description?: string;
};

export type SimproStaffRow = {
  ID: number;
  Name: string;
  Type?: string;             // 'employee' | 'plant' | etc
  TypeId?: number;
  Email?: string;
  Phone?: string;
};

export type SimproScheduleRow = {
  ID: number;
  Type?: string;             // 'activity' | 'job' | etc
  Reference?: string;        // Job/Quote/Activity ID as string
  TotalHours?: number;
  Staff?: { ID?: number; Name?: string; Type?: string; TypeId?: number };
  Date?: string;             // 'YYYY-MM-DD'
  Project?: string;
  Blocks?: Array<{
    Hrs?: number;
    StartTime?: string;
    EndTime?: string;
    ISO8601StartTime?: string;
    ISO8601EndTime?: string;
    ScheduleRate?: { ID?: number; Name?: string };
  }>;
};

function buildPath(resource: string): string {
  return `/api/v1.0/companies/${env().companyId}/${resource}/`;
}

// ============================================================
// Public listing iterators
// ============================================================
// SimPro list endpoints return MINIMAL columns (ID + Type) unless you pass
// `columns=...` with the explicit fields you want. Without this every job
// arrives with no Status/Stage/DateIssued/CompletedDate — making it impossible
// to compute revenue, completion, or date series. Verified column names against
// /companies/0/jobs/{id} detail responses, not the swagger (which is incomplete).
const CUSTOMER_COLUMNS = 'ID,Type,CompanyName,GivenName,FamilyName,Email,Phone,Address,DateCreated';
const QUOTE_COLUMNS = 'ID,Customer,Stage,Status,Total,DateIssued,DateApproved,IsClosed,Site';
// Totals brings GrossProfitLoss, GrossMargin, MaterialsCost, Labor, LaborHours.
const JOB_COLUMNS = 'ID,Customer,Status,Stage,DateIssued,CompletedDate,Site,Total,Totals,Type';
// SimPro `/staff/` list endpoint accepts only ID,Name,Type,TypeId.
// Email/Phone aren't list columns — they live on the per-staff detail endpoint.
const STAFF_COLUMNS = 'ID,Name,Type,TypeId';
// Schedules don't need an explicit columns param — they return the full
// Block/Staff/Date shape by default.

export async function* fetchCustomers(modifiedSince?: string) {
  const params: Record<string, string | undefined> = { columns: CUSTOMER_COLUMNS };
  if (modifiedSince) params['ModifiedSince'] = modifiedSince;
  yield* paginate<SimproCustomerRow>(buildPath('customers'), params);
}

export async function* fetchQuotes(modifiedSince?: string) {
  const params: Record<string, string | undefined> = { columns: QUOTE_COLUMNS };
  if (modifiedSince) params['ModifiedSince'] = modifiedSince;
  yield* paginate<SimproQuoteRow>(buildPath('quotes'), params);
}

export async function* fetchJobs(modifiedSince?: string) {
  const params: Record<string, string | undefined> = { columns: JOB_COLUMNS };
  if (modifiedSince) params['ModifiedSince'] = modifiedSince;
  yield* paginate<SimproJobRow>(buildPath('jobs'), params);
}

// Staff endpoint returns equipment ("plant") AND people ("employee") in one list.
// We pass the whole lot through to sync — the sync layer filters to employees
// for the dashboard but keeps everything so historical schedule joins still work.
export async function* fetchStaff() {
  const params: Record<string, string | undefined> = { columns: STAFF_COLUMNS };
  yield* paginate<SimproStaffRow>(buildPath('staff'), params);
}

// Schedules: optionally filter by date range. Without `Date` filter the
// endpoint returns ALL schedules ever (which on FlowPro is ~50k+ blocks).
// For utilization we only need the trailing 12 months.
export async function* fetchSchedules(opts?: { from?: string; to?: string }) {
  const params: Record<string, string | undefined> = {};
  if (opts?.from) params['Date'] = `ge(${opts.from})`;
  if (opts?.to) params['Date'] = params['Date']
    ? `${params['Date']},le(${opts.to})`
    : `le(${opts.to})`;
  yield* paginate<SimproScheduleRow>(buildPath('schedules'), params);
}

// Smoke-test: confirm tenant + OAuth + API access
export async function ping(): Promise<{ ok: true; companies: Array<{ ID: number; Name?: string }> }> {
  const { data } = await simproFetch<Array<{ ID: number; Name?: string }>>('/api/v1.0/companies/');
  return { ok: true, companies: data };
}

// ============================================================
// Writes — used by the online booking flow (/api/book).
// Validated against the live Flow Pro tenant: an inbound booking becomes
// an Individual Customer -> Site -> Lead (Stage "Open"). createSite=true on
// the customer does NOT return a usable site here, so we create the site
// explicitly and reference it on the lead.
// ============================================================
async function simproPost<T>(path: string, body: unknown): Promise<T> {
  const doFetch = (token: string) =>
    fetch(baseUrl() + path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

  let token = await getToken();
  let res = await doFetch(token);
  if (res.status === 401) {
    cached = null;
    token = await getToken();
    res = await doFetch(token);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SimPro POST ${res.status} on ${path}: ${text.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function splitName(full: string): { given: string; family: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { given: parts[0] ?? 'Customer', family: '—' };
  return { given: parts[0], family: parts.slice(1).join(' ') };
}

export type BookingInput = {
  name: string;
  email: string;
  phone: string;
  address: string;
  service?: string;
  urgency?: string;
  description?: string;
  photoUrls?: string[];
};

// Orchestrates Customer -> Site -> Lead. Returns the created SimPro IDs.
// Throws on any step so the caller can mark the booking as 'error' and the
// customer never sees a false confirmation.
export async function createBookingInSimpro(
  b: BookingInput,
): Promise<{ customerId: number; siteId: number; leadId: number }> {
  const cid = env().companyId;
  const { given, family } = splitName(b.name);
  const address = { Address: b.address, Country: 'New Zealand' };

  const customer = await simproPost<{ ID: number }>(
    `/api/v1.0/companies/${cid}/customers/individuals/`,
    { GivenName: given, FamilyName: family, Email: b.email, Phone: b.phone, Address: address },
  );

  const site = await simproPost<{ ID: number }>(
    `/api/v1.0/companies/${cid}/sites/`,
    { Name: `${b.name} — ${b.address}`.slice(0, 250), Address: address },
  );

  const notes = [
    b.description ? `<p>${escapeHtml(b.description)}</p>` : '',
    b.photoUrls && b.photoUrls.length
      ? `<p>Photos:<br>${b.photoUrls.map((u) => `<a href="${u}">${escapeHtml(u)}</a>`).join('<br>')}</p>`
      : '',
    `<p><em>Submitted via the online booking form on ${new Date().toLocaleString('en-NZ')}.</em></p>`,
  ]
    .filter(Boolean)
    .join('');

  const lead = await simproPost<{ ID: number }>(`/api/v1.0/companies/${cid}/leads/`, {
    LeadName: `${b.service ?? 'Booking'} — ${b.urgency ?? ''} — ${b.name}`.slice(0, 250),
    Customer: customer.ID,
    Site: site.ID,
    Stage: 'Open',
    Description: `Service: ${b.service ?? '—'} | Urgency: ${b.urgency ?? '—'}`,
    Notes: notes,
  });

  return { customerId: customer.ID, siteId: site.ID, leadId: lead.ID };
}
