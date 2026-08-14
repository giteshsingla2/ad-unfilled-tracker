-- Run this once to set up the database
-- psql -U your_user -d your_db -f schema.sql

CREATE TABLE IF NOT EXISTS ad_stats_hourly (
  id BIGSERIAL PRIMARY KEY,
  domain TEXT NOT NULL,
  ad_unit TEXT NOT NULL,
  page_url TEXT NOT NULL,
  hour_bucket TIMESTAMP NOT NULL,
  requests INT NOT NULL DEFAULT 0,
  filled INT NOT NULL DEFAULT 0,
  unfilled INT NOT NULL DEFAULT 0,
  unfilled_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN requests > 0 THEN ROUND((unfilled::numeric / requests) * 100, 2) ELSE 0 END
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- prevents duplicate rows if the flush job ever runs twice on the same hour
  CONSTRAINT uniq_domain_adunit_url_hour UNIQUE (domain, ad_unit, page_url, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_domain_hour ON ad_stats_hourly (domain, hour_bucket);
CREATE INDEX IF NOT EXISTS idx_url ON ad_stats_hourly (page_url);
CREATE INDEX IF NOT EXISTS idx_adunit ON ad_stats_hourly (ad_unit);
CREATE INDEX IF NOT EXISTS idx_hour_bucket ON ad_stats_hourly (hour_bucket);
