-- Online booking flow (public /book.html) — captures customer-submitted
-- bookings, then pushes each one to SimPro as Customer + Site + Lead.
-- The public POST /api/book route inserts here (service-role) and the
-- dashboard reads from here for the Bookings tab + bell feed.

create table if not exists bookings (
  id                  uuid primary key default gen_random_uuid(),
  ref                 text not null unique,            -- friendly ref shown to the customer, e.g. FP-48213
  -- Submitted details
  name                text not null,
  email               text not null,
  phone               text not null,
  address             text not null,
  service             text,                            -- Plumbing / Gasfitting / Hot Water / ...
  urgency             text,                            -- Emergency / This week / Flexible
  description         text,
  photo_urls          text[] not null default '{}',
  -- SimPro push outcome
  status              text not null default 'new'
                        check (status in ('new','sent_to_simpro','error')),
  simpro_customer_id  bigint,
  simpro_site_id      bigint,
  simpro_lead_id      bigint,
  simpro_error        text,
  -- Customer email (wired later; tracked now so it's a trivial add)
  email_status        text not null default 'not_sent'
                        check (email_status in ('not_sent','sent','error')),
  -- Dashboard bell: unread until someone opens the booking
  seen                boolean not null default false,
  raw                 jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists bookings_created_idx on bookings (created_at desc);
create index if not exists bookings_status_idx  on bookings (status);
create index if not exists bookings_seen_idx     on bookings (seen) where seen = false;

-- Server (route handlers) uses the service-role key. The dashboard reads
-- server-side too, but grant SELECT to anon/authenticated to match the
-- existing tables' pattern. Public visitors never touch this table
-- directly — inserts only happen through the service-role API route.
grant select, insert, update on bookings to service_role;
grant select on bookings to authenticated, anon;

-- Public bucket for customer-uploaded job photos. The service-role route
-- uploads; public read lets the team open them from the dashboard / SimPro.
insert into storage.buckets (id, name, public)
values ('booking-photos', 'booking-photos', true)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
