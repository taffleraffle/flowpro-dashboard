-- Customer summary view — pre-aggregates per-customer job stats so the
-- Customers tab doesn't have to page through all 16k+ simpro_jobs rows
-- on every cold cache miss (was taking ~16s). One query, ~1k rows.

CREATE OR REPLACE VIEW v_customer_summary AS
SELECT
  c.id,
  c.company_name,
  c.given_name,
  c.family_name,
  c.address_city,
  c.address_postcode,
  c.raw,
  COALESCE(j.jobs_count, 0)::int      AS jobs_count,
  COALESCE(j.total_revenue, 0)::numeric AS total_revenue,
  j.first_job_date,
  j.last_job_date
FROM simpro_customers c
LEFT JOIN (
  SELECT
    customer_id,
    COUNT(*)                                  AS jobs_count,
    SUM(total_ex_tax)                         AS total_revenue,
    MIN(COALESCE(date_completed, date_created))::date AS first_job_date,
    MAX(COALESCE(date_completed, date_created))::date AS last_job_date
  FROM simpro_jobs
  WHERE is_complete = true AND customer_id IS NOT NULL
  GROUP BY customer_id
) j ON j.customer_id = c.id;

GRANT SELECT ON v_customer_summary TO service_role, authenticated, anon;

-- Per-month customer counts for the growth chart (last 24 months, customer-unique-per-month).
-- Lets us drop the second loadCustomerData() round-trip in customers-metrics.ts.
CREATE OR REPLACE VIEW v_customer_growth_monthly AS
SELECT
  to_char(date_trunc('month', COALESCE(date_completed, date_created)), 'YYYY-MM') AS month,
  COUNT(DISTINCT customer_id) AS active_customers
FROM simpro_jobs
WHERE is_complete = true
  AND customer_id IS NOT NULL
  AND COALESCE(date_completed, date_created) >= (current_date - interval '24 months')
GROUP BY 1;

GRANT SELECT ON v_customer_growth_monthly TO service_role, authenticated, anon;

NOTIFY pgrst, 'reload schema';
