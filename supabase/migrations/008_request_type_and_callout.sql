-- The booking form now asks two things it didn't before:
--   1. Is this a job booking, or just a quote request? (customers were bailing
--      because the form only offered "book a plumber".)
--   2. Which call-out rate applies, based on when they want us: standard
--      ($199 + GST, Mon-Fri 7am-5pm) or after-hours ($379 + GST).
-- Both are resolved server-side in src/lib/callout.ts and stored per booking so
-- the office can see exactly what the customer was shown.

alter table bookings add column if not exists request_type text not null default 'booking';
alter table bookings add column if not exists after_hours  boolean;
alter table bookings add column if not exists callout_rate numeric(10,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_request_type_check'
  ) then
    alter table bookings
      add constraint bookings_request_type_check
      check (request_type in ('booking','quote'));
  end if;
end $$;

create index if not exists bookings_request_type_idx on bookings (request_type);

notify pgrst, 'reload schema';
