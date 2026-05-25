# FlowPro Dashboard

Marketing performance dashboard for **FlowPro Plumbers & Gasfitters** (Silverdale, Auckland).

Pulls from SimPro (jobs/quotes/customers), WhatConverts (lead attribution), and — when wired — Google Ads + Meta Ads. Joins WhatConverts leads to SimPro customers by phone/email so closed-job revenue can be attributed back to lead source / keyword / campaign.

## Stack

- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL) for cached data + sync logging
- Tailwind CSS + custom FlowPro design tokens (navy + cyan, Barlow Condensed)
- Vercel Cron for 30-minute autoSync

## What's live vs stubbed

| Section | Status | Source |
|---|---|---|
| KPI strip (revenue, leads, CPL, quoted, close rate, ROAS) | Live | SimPro + WhatConverts + ads_spend_daily |
| Lead sources | Live | WhatConverts |
| Job geography (distance from Silverdale HQ) | Live | SimPro (geocode pass for unmapped jobs is v2) |
| Recent jobs / customers | Live | SimPro |
| Data sync health | Live | sync_runs table |
| Revenue trend / Revenue by category | Stub | Pending visual pass |
| Acquisition funnel | Stub | Data is there, chart pending |
| Top keywords | Stub | Needs Google Ads OAuth |
| SEO vs Paid | Stub | Needs Google Ads + Meta Ads |
| Sales pipeline (kanban) | Stub | v2 |
| Crew leaderboard / Today's schedule | Stub | Needs tech + schedule tables in v2 |

## First-run setup

### 1. Install

```bash
npm install
```

### 2. Supabase

Create a project at supabase.com, then run the migration:

```bash
# Either via Supabase CLI:
supabase db push

# …or paste supabase/migrations/001_init.sql into SQL Editor and run.
# Don't forget: NOTIFY pgrst, 'reload schema'; is at the end.
```

### 3. Env vars

Copy `.env.example` to `.env.local` and fill in. The values you still need to paste are:

| Var | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (service_role) |
| `SIMPRO_TENANT` | subdomain of your SimPro URL — e.g. `optdigital` if URL is `optdigital.simprosuite.com` |
| `SIMPRO_COMPANY_ID` | usually `0`. Confirm by hitting `/api/v1.0/companies/` once |
| `WC_API_SECRET` | WhatConverts → Settings → Integrations → API |
| `WC_PROFILE_IDS` | comma-separated profile IDs for **FlowPro** + **A Plumber Near Me** |
| `CRON_SECRET` | any random 32+ char string — used to auth Vercel Cron |
| `GOOGLE_ADS_*` | stubbed for now |
| `META_*` | stubbed for now |

Already filled in `.env.example`:
- `SIMPRO_ACCESS_TOKEN` (provided in original brief)
- `WC_API_TOKEN` (provided in original brief)
- `OFFICE_ADDRESS`, `OFFICE_LAT`, `OFFICE_LNG` (Silverdale, Auckland)

### 4. Run a first sync

```bash
# Local (no Vercel needed):
npm run sync:simpro
npm run sync:whatconverts

# Or via HTTP once dev server is up:
curl -X POST 'http://localhost:3030/api/sync/simpro'
curl -X POST 'http://localhost:3030/api/sync/whatconverts'
```

### 5. Boot the dashboard

```bash
npm run dev
# → http://localhost:3030
```

## autoSync (production)

`vercel.json` registers two cron jobs at `*/30 * * * *` (every 30 min). The cron URL includes `?secret=${CRON_SECRET}` so unauthenticated triggers are rejected. Replace `__REPLACE_WITH_CRON_SECRET__` in `vercel.json` with your actual `CRON_SECRET` value before deploying — or migrate to Vercel's signed cron headers.

If a sync fails, the failure surfaces in the "Data sync health" card on the Overview page — never silent.

## Architecture

```
SimPro / WhatConverts / Ads APIs
        │ (every 30 min)
        ▼
  /api/sync/[source]  ──►  sync_runs (logged)
        │                       │
        ▼                       ▼
  Supabase cached tables    UI badge: ok / error / running
  (simpro_*, wc_leads,
   ads_spend_daily, …)
        │
        ▼
   src/lib/metrics.ts (server-side queries)
        │
        ▼
   App Router pages (RSC) — no client-side fetching of source APIs
```

The dashboard NEVER calls SimPro / WhatConverts / Ads APIs from a request path. All reads come from the Supabase cache. This keeps the dashboard fast and stops API quotas from being burned on every page load.

## Adding a new data source

1. Add table(s) to a new `supabase/migrations/00X_*.sql`.
2. Write `src/lib/<source>.ts` (HTTP client) + `src/lib/sync-<source>.ts` (upsert pipeline).
3. Add case to `src/app/api/sync/[source]/route.ts`.
4. Add to `vercel.json` cron list.
5. Surface metrics via `src/lib/metrics.ts` and a card component.

That's it — schema and ingest are source-agnostic.
