// WhatConverts API client.
// Docs: https://app.whatconverts.com/docs/api/v1/
// Auth: Basic Auth with api_token:api_secret
// Endpoints used: GET /leads with profile_id filter.

type WCEnv = { token: string; secret: string; profileIds: number[] };

function env(): WCEnv {
  const token = process.env.WC_API_TOKEN;
  const secret = process.env.WC_API_SECRET;
  const profileEnv = process.env.WC_PROFILE_IDS ?? '';
  if (!token) throw new Error('WC_API_TOKEN env var missing');
  if (!secret) throw new Error('WC_API_SECRET env var missing — paste the secret from WhatConverts → Settings → Integrations → API');
  const profileIds = profileEnv
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => Number(s))
    .filter(n => Number.isFinite(n) && n > 0);
  if (profileIds.length === 0) {
    throw new Error('WC_PROFILE_IDS env var missing — comma-separated profile IDs for FlowPro + A Plumber Near Me');
  }
  return { token, secret, profileIds };
}

const BASE = 'https://app.whatconverts.com/api/v1';

function authHeader(): string {
  const { token, secret } = env();
  return 'Basic ' + Buffer.from(`${token}:${secret}`).toString('base64');
}

export type WCLeadRow = {
  lead_id: number;
  profile_id: number;
  profile?: string;
  lead_type?: string;
  lead_status?: string;
  quotable?: string | boolean;
  quote_value?: number;
  sales_value?: number;
  date_created?: string;
  contact_name?: string;
  contact_phone_number?: string;
  contact_email_address?: string;
  contact_company?: string;
  contact_country?: string;
  lead_source?: string;
  lead_medium?: string;
  lead_campaign?: string;
  lead_keywords?: string;
  gclid?: string;
  msclkid?: string;
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  [k: string]: unknown;
};

type LeadsResponse = {
  leads: WCLeadRow[];
  page_number?: number;
  total_pages?: number;
  total_leads?: number;
};

export async function* fetchLeads(opts: { profileId: number; startDate?: string; endDate?: string }): AsyncGenerator<WCLeadRow> {
  const PAGE_SIZE = 250;
  let page = 1;
  const HARD_CAP = 200;
  while (page <= HARD_CAP) {
    const url = new URL(`${BASE}/leads`);
    url.searchParams.set('profile_id', String(opts.profileId));
    url.searchParams.set('page_size', String(PAGE_SIZE));
    url.searchParams.set('page_number', String(page));
    if (opts.startDate) url.searchParams.set('start_date', opts.startDate);
    if (opts.endDate) url.searchParams.set('end_date', opts.endDate);

    const res = await fetch(url.toString(), {
      headers: { Authorization: authHeader(), Accept: 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`WhatConverts ${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
    }
    const json = (await res.json()) as LeadsResponse;
    if (!Array.isArray(json.leads) || json.leads.length === 0) return;
    for (const lead of json.leads) yield { ...lead, profile_id: opts.profileId };
    if (json.total_pages && page >= json.total_pages) return;
    page += 1;
  }
}

export function getProfileIds(): number[] {
  return env().profileIds;
}

// Smoke-test creds — counts leads in last 7 days across all profiles.
export async function ping(): Promise<{ ok: true; counts: Record<number, number> }> {
  const profileIds = env().profileIds;
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const counts: Record<number, number> = {};
  for (const pid of profileIds) {
    let n = 0;
    for await (const _lead of fetchLeads({ profileId: pid, startDate, endDate })) n += 1;
    counts[pid] = n;
  }
  return { ok: true, counts };
}
