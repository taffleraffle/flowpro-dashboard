-- simpro_schedules.staff_id references staff that may have been deleted
-- or that don't appear in the staff list endpoint (which truncates by Type
-- filter). Drop the FK — we still keep the column for joining, but at
-- application level. Same pattern as simpro_jobs.quote_id (migration 001).
alter table simpro_schedules
  drop constraint if exists simpro_schedules_staff_id_fkey;

-- wc_simpro_matches lead_id -> wc_leads(id) is fine.
-- wc_simpro_matches first_job_id -> simpro_jobs(id) — keep, the bridge is
-- rebuilt after both sides are synced so this should be safe.

notify pgrst, 'reload schema';
