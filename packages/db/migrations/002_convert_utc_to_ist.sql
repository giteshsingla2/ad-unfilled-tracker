-- ============================================================
--  Migration: Convert hour_bucket from UTC to IST (GMT+5:30)
--  Run on your server with:
--    psql -h 127.0.0.1 -U tracker_user -d ad_tracker -f packages/db/migrations/002_convert_utc_to_ist.sql
-- ============================================================

-- STEP 1: Preview how many rows exist and what the date range looks like
SELECT
  COUNT(*)                                                        AS total_rows,
  MIN(hour_bucket)                                                AS oldest_utc,
  MAX(hour_bucket)                                                AS newest_utc,
  MIN(hour_bucket + INTERVAL '5 hours 30 minutes')               AS oldest_ist,
  MAX(hour_bucket + INTERVAL '5 hours 30 minutes')               AS newest_ist
FROM ad_stats_hourly;

-- STEP 2: Preview the first 20 rows to sanity-check the conversion
SELECT
  hour_bucket                                                         AS old_utc_bucket,
  DATE_TRUNC('hour', hour_bucket + INTERVAL '5 hours 30 minutes')    AS new_ist_bucket
FROM ad_stats_hourly
ORDER BY hour_bucket
LIMIT 20;

-- STEP 3: Run the actual migration inside a transaction.
--   If the SELECT at the end looks correct, type COMMIT.
--   If something looks wrong, type ROLLBACK — no data will be changed.
BEGIN;

UPDATE ad_stats_hourly
SET hour_bucket = DATE_TRUNC('hour', hour_bucket + INTERVAL '5 hours 30 minutes');

-- Verify after update
SELECT
  COUNT(*)           AS total_rows,
  MIN(hour_bucket)   AS oldest_ist,
  MAX(hour_bucket)   AS newest_ist
FROM ad_stats_hourly;

-- ✅ If the dates look right (shifted by +5:30), run:
--    COMMIT;
--
-- ❌ If something looks wrong, run:
--    ROLLBACK;
