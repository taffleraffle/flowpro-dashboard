-- gross_margin is a percentage returned by SimPro Totals.GrossMargin.Actual.
-- For loss-making jobs SimPro can return values like -10026.49 (negative
-- thousands of percent) which overflows numeric(5,2). Widen to fit the
-- full plausible range.
alter table simpro_jobs
  alter column gross_margin type numeric(10, 2);

notify pgrst, 'reload schema';
