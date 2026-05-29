-- Extra intake fields captured by the booking form, matching Flow Pro's
-- current text-intake script: owner/tenant + a preferred date/time.

alter table bookings add column if not exists owner_or_tenant text;   -- 'Owner' | 'Tenant'
alter table bookings add column if not exists preferred_date   text;  -- 'YYYY-MM-DD' or null
alter table bookings add column if not exists preferred_time   text;  -- 'Morning' | 'Afternoon' | 'Evening' | 'Anytime' or null

notify pgrst, 'reload schema';
