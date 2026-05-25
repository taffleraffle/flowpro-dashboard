-- ============================================================
-- Phase 2: Cost/margin per job + Staff + Schedules + WC↔SimPro bridge
--
-- All three roll up to the same dashboard: real margin %, real tech
-- utilization, real lead-to-cash funnel.
-- ============================================================

-- 1. Cost / profit columns on simpro_jobs (from SimPro `Totals` payload)
alter table simpro_jobs
  add column if not exists cost_ex_tax    numeric(12,2),
  add column if not exists gross_profit   numeric(12,2),
  add column if not exists gross_margin   numeric(5,2),
  add column if not exists nett_profit    numeric(12,2),
  add column if not exists materials_cost numeric(12,2),
  add column if not exists labor_cost     numeric(12,2),
  add column if not exists labor_hours    numeric(8,2);

create index if not exists simpro_jobs_margin_idx
  on simpro_jobs (gross_margin)
  where is_complete = true;

-- 2. Staff (employees only — equipment "plant" rows live in raw but filtered out by sync)
create table if not exists simpro_staff (
  id          bigint primary key,
  name        text not null,
  type        text,            -- 'employee' | 'plant' | etc
  type_id     bigint,
  email       text,
  phone       text,
  raw         jsonb not null,
  synced_at   timestamptz not null default now()
);
create index if not exists simpro_staff_type_idx on simpro_staff (type);

-- 3. Schedule blocks — each tech-hour-on-a-job
create table if not exists simpro_schedules (
  id            bigint primary key,
  staff_id      bigint references simpro_staff(id) on delete set null,
  staff_name    text,
  job_id        bigint,          -- references simpro_jobs.id but no FK (Schedule.Reference can be quote/activity/job)
  schedule_type text,            -- 'job' | 'activity' | etc
  date          date,
  total_hours   numeric(6,2),
  rate_name     text,            -- 'Normal Time' | 'Overtime' | etc (from Blocks[0].ScheduleRate.Name)
  raw           jsonb not null,
  synced_at     timestamptz not null default now()
);
create index if not exists simpro_schedules_staff_date_idx on simpro_schedules (staff_id, date desc);
create index if not exists simpro_schedules_job_idx on simpro_schedules (job_id);
create index if not exists simpro_schedules_date_idx on simpro_schedules (date desc);

-- 4. WhatConverts ↔ SimPro bridge
-- Maps WC leads to the SimPro customer/job they converted into.
-- Matching happens on normalized phone first, then email.
-- Same lead can match multiple jobs (repeat customer) — we only keep the FIRST.
-- wc_leads PK is `id` (bigint), see migration 001.
create table if not exists wc_simpro_matches (
  lead_id        bigint primary key references wc_leads(id) on delete cascade,
  customer_id    bigint references simpro_customers(id) on delete set null,
  first_job_id   bigint references simpro_jobs(id) on delete set null,
  first_job_date date,
  job_revenue    numeric(12,2),
  job_count      integer default 0,
  match_method   text,           -- 'phone' | 'email' | 'phone+email'
  confidence     numeric(3,2),   -- 0.00-1.00
  matched_at     timestamptz not null default now()
);
create index if not exists wc_simpro_matches_customer_idx on wc_simpro_matches (customer_id);
create index if not exists wc_simpro_matches_job_idx on wc_simpro_matches (first_job_id);

-- RLS — service-role bypass, public denied (matches existing pattern)
alter table simpro_staff       enable row level security;
alter table simpro_schedules   enable row level security;
alter table wc_simpro_matches  enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['simpro_staff','simpro_schedules','wc_simpro_matches']) loop
    execute format('drop policy if exists %I_deny_all on %I', t, t);
    execute format('create policy %I_deny_all on %I for all to public using (false) with check (false)', t, t);
  end loop;
end $$;

notify pgrst, 'reload schema';
