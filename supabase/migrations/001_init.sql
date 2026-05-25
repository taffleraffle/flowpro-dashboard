-- FlowPro dashboard — initial schema
-- Cached tables for SimPro, WhatConverts, and Ads data.
-- All syncs upsert here on a schedule; the dashboard reads from these only.

-- ------------------------------------------------------------------
-- sync_runs: every sync attempt logged so failures surface in the UI
-- ------------------------------------------------------------------
create table if not exists sync_runs (
  id            bigserial primary key,
  source        text not null check (source in ('simpro','whatconverts','google_ads','meta_ads','geocode')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running' check (status in ('running','ok','error')),
  rows_upserted integer default 0,
  error_message text,
  details       jsonb default '{}'::jsonb
);
create index if not exists sync_runs_source_started_idx on sync_runs (source, started_at desc);

-- ------------------------------------------------------------------
-- SimPro: customers, jobs, quotes
-- We store the SimPro ID as the primary key for clean upserts.
-- ------------------------------------------------------------------
create table if not exists simpro_customers (
  id              bigint primary key,
  company_name    text,
  given_name      text,
  family_name     text,
  email           text,
  phone           text,
  address_line1   text,
  address_city    text,
  address_postcode text,
  address_country text,
  lat             double precision,
  lng             double precision,
  raw             jsonb not null,
  synced_at       timestamptz not null default now()
);
create index if not exists simpro_customers_email_idx on simpro_customers (lower(email));
create index if not exists simpro_customers_phone_idx on simpro_customers (phone);

create table if not exists simpro_quotes (
  id              bigint primary key,
  customer_id     bigint references simpro_customers(id) on delete set null,
  status          text,
  total_ex_tax    numeric(12,2),
  total_inc_tax   numeric(12,2),
  date_issued     date,
  date_approved   date,
  is_approved     boolean default false,
  raw             jsonb not null,
  synced_at       timestamptz not null default now()
);
create index if not exists simpro_quotes_customer_idx on simpro_quotes (customer_id);
create index if not exists simpro_quotes_date_idx on simpro_quotes (date_issued desc);

create table if not exists simpro_jobs (
  id              bigint primary key,
  customer_id     bigint references simpro_customers(id) on delete set null,
  quote_id        bigint references simpro_quotes(id) on delete set null,
  status          text,
  total_ex_tax    numeric(12,2),
  total_inc_tax   numeric(12,2),
  date_created    date,
  date_completed  date,
  is_complete     boolean default false,
  site_address    text,
  site_lat        double precision,
  site_lng        double precision,
  distance_km     numeric(8,2),
  raw             jsonb not null,
  synced_at       timestamptz not null default now()
);
create index if not exists simpro_jobs_customer_idx on simpro_jobs (customer_id);
create index if not exists simpro_jobs_date_idx on simpro_jobs (date_created desc);
create index if not exists simpro_jobs_complete_idx on simpro_jobs (is_complete);

-- ------------------------------------------------------------------
-- WhatConverts: leads (calls + forms + chats)
-- profile_id lets us split FlowPro vs "A Plumber Near Me"
-- ------------------------------------------------------------------
create table if not exists wc_leads (
  id              bigint primary key,
  profile_id      bigint not null,
  profile_name    text,
  lead_type       text,
  lead_status     text,
  quotable        boolean,
  quote_value     numeric(12,2),
  sales_value     numeric(12,2),
  date_created    timestamptz,
  caller_name     text,
  caller_phone    text,
  caller_email    text,
  caller_country  text,
  lead_source     text,
  lead_medium     text,
  lead_campaign   text,
  lead_keyword    text,
  gclid           text,
  msclkid         text,
  fbclid          text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_term        text,
  utm_content     text,
  matched_simpro_customer_id bigint references simpro_customers(id) on delete set null,
  raw             jsonb not null,
  synced_at       timestamptz not null default now()
);
create index if not exists wc_leads_profile_idx on wc_leads (profile_id);
create index if not exists wc_leads_date_idx on wc_leads (date_created desc);
create index if not exists wc_leads_phone_idx on wc_leads (caller_phone);
create index if not exists wc_leads_email_idx on wc_leads (lower(caller_email));
create index if not exists wc_leads_source_idx on wc_leads (lead_source);

-- ------------------------------------------------------------------
-- Ads spend (daily, source-agnostic for future channels)
-- ------------------------------------------------------------------
create table if not exists ads_spend_daily (
  source          text not null check (source in ('google_ads','meta_ads','microsoft_ads','tiktok_ads','linkedin_ads')),
  date            date not null,
  -- Empty string sentinel for "account-level / no campaign" — NULLs would
  -- silently duplicate rows because (a,b,NULL) ≠ (a,b,NULL) in PK comparison.
  campaign_id     text not null default '',
  campaign_name   text,
  spend           numeric(12,2) not null default 0,
  impressions     bigint default 0,
  clicks          bigint default 0,
  conversions     numeric(10,2) default 0,
  conversion_value numeric(12,2) default 0,
  raw             jsonb default '{}'::jsonb,
  synced_at       timestamptz not null default now(),
  primary key (source, date, campaign_id)
);
create index if not exists ads_spend_date_idx on ads_spend_daily (date desc);

-- ------------------------------------------------------------------
-- Keyword performance (Google Ads, Microsoft Ads)
-- ------------------------------------------------------------------
create table if not exists keywords_daily (
  source          text not null check (source in ('google_ads','microsoft_ads')),
  date            date not null,
  campaign_id     text not null default '',
  ad_group_id     text not null default '',
  keyword         text not null,
  match_type      text not null default '',
  impressions     bigint default 0,
  clicks          bigint default 0,
  spend           numeric(12,2) default 0,
  conversions     numeric(10,2) default 0,
  conversion_value numeric(12,2) default 0,
  avg_position    numeric(5,2),
  quality_score   integer,
  synced_at       timestamptz not null default now(),
  primary key (source, date, campaign_id, ad_group_id, keyword, match_type)
);
create index if not exists keywords_date_idx on keywords_daily (date desc);
create index if not exists keywords_keyword_idx on keywords_daily (keyword);

-- ------------------------------------------------------------------
-- RLS: lock everything down. All reads and writes go via the
-- service-role key from Next.js server routes (RLS bypassed).
-- The anon key gets nothing — no SELECT policies are defined.
-- If we ever expose a public/embed view, add a narrow policy then.
-- ------------------------------------------------------------------
alter table sync_runs        enable row level security;
alter table simpro_customers enable row level security;
alter table simpro_quotes    enable row level security;
alter table simpro_jobs      enable row level security;
alter table wc_leads         enable row level security;
alter table ads_spend_daily  enable row level security;
alter table keywords_daily   enable row level security;

-- Defensive: drop any prior permissive policies if this migration is re-run.
do $$
declare t text;
begin
  for t in select unnest(array['sync_runs','simpro_customers','simpro_quotes','simpro_jobs','wc_leads','ads_spend_daily','keywords_daily']) loop
    execute format('drop policy if exists "%s_read_all" on %I', t, t);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- RPC: match WhatConverts leads to SimPro customers
-- Joins on last 9 phone digits OR lowercased email.
-- Returns number of newly matched rows.
-- ------------------------------------------------------------------
create or replace function match_wc_leads_to_simpro()
returns integer
language plpgsql
security definer
as $$
declare
  phone_count integer := 0;
  email_count integer := 0;
begin
  -- Phone match first (most reliable). Sequential statements so the
  -- email pass sees the phone updates and doesn't double-match.
  update wc_leads l
     set matched_simpro_customer_id = c.id
    from simpro_customers c
   where l.matched_simpro_customer_id is null
     and l.caller_phone is not null
     and c.phone is not null
     and right(regexp_replace(c.phone, '\D', '', 'g'), 9) =
         right(regexp_replace(l.caller_phone, '\D', '', 'g'), 9)
     and length(right(regexp_replace(l.caller_phone, '\D', '', 'g'), 9)) = 9;
  get diagnostics phone_count = row_count;

  update wc_leads l
     set matched_simpro_customer_id = c.id
    from simpro_customers c
   where l.matched_simpro_customer_id is null
     and l.caller_email is not null
     and c.email is not null
     and lower(l.caller_email) = lower(c.email);
  get diagnostics email_count = row_count;

  return phone_count + email_count;
end;
$$;

grant execute on function match_wc_leads_to_simpro() to service_role;

notify pgrst, 'reload schema';
