-- ============================================================
--  Migration 002 (v2): Convert hour_bucket from UTC to IST (GMT+5:30)
--  Collision-safe: aggregates rows that map to the same IST hour.
--
--  Run on your server with:
--    psql -h 127.0.0.1 -U giteshsingla -d ad_tracker \
--      -f packages/db/migrations/002_convert_utc_to_ist.sql
-- ============================================================

BEGIN;

-- STEP 1: Aggregate all rows into their IST hour bucket.
--   Rows whose UTC hours both map to the same IST hour are merged
--   by summing requests / filled / unfilled.
CREATE TEMP TABLE ist_agg AS
SELECT
  domain,
  ad_unit,
  page_url,
  DATE_TRUNC('hour', hour_bucket + INTERVAL '5 hours 30 minutes') AS hour_bucket,
  SUM(requests)::int  AS requests,
  SUM(filled)::int    AS filled,
  SUM(unfilled)::int  AS unfilled,
  MIN(created_at)     AS created_at
FROM ad_stats_hourly
GROUP BY
  domain,
  ad_unit,
  page_url,
  DATE_TRUNC('hour', hour_bucket + INTERVAL '5 hours 30 minutes');

-- STEP 2: Preview row counts before and after aggregation
SELECT
  (SELECT COUNT(*) FROM ad_stats_hourly) AS original_rows,
  (SELECT COUNT(*) FROM ist_agg)         AS aggregated_rows,
  (SELECT MIN(hour_bucket) FROM ist_agg) AS new_oldest_ist,
  (SELECT MAX(hour_bucket) FROM ist_agg) AS new_newest_ist;

-- STEP 3: Clear the original table (preserves sequences and constraints)
TRUNCATE ad_stats_hourly;

-- STEP 4: Re-insert with IST-bucketed, merged data
INSERT INTO ad_stats_hourly
  (domain, ad_unit, page_url, hour_bucket, requests, filled, unfilled, created_at)
SELECT
  domain, ad_unit, page_url, hour_bucket, requests, filled, unfilled, created_at
FROM ist_agg;

-- STEP 5: Final verification
SELECT
  COUNT(*)           AS total_rows,
  MIN(hour_bucket)   AS oldest_ist,
  MAX(hour_bucket)   AS newest_ist
FROM ad_stats_hourly;

-- ✅ If everything looks correct, run:  COMMIT;
-- ❌ If something looks wrong, run:     ROLLBACK;
