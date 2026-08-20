# Migration 003 — DB Invariant Documentation (No SQL Needed)

## Status: Documentation Only

No SQL migration is required. This file documents the state of the `hour_bucket`
column after migration `002_convert_utc_to_ist.sql` was applied, and defines the
canonical invariant that all code in this repo must respect.

---

## DB Invariant (as of migration 002)

> **`hour_bucket` stores IST wall-clock timestamps as `TIMESTAMP WITHOUT TIME ZONE`.**

- The column type is `TIMESTAMP WITHOUT TIME ZONE` (no timezone offset stored).
- Values represent IST (Asia/Kolkata, UTC+5:30) calendar time — e.g.,
  `2026-08-21 13:00:00` means 1 PM in India Standard Time.
- IST does **not** observe Daylight Saving Time, so the +5:30 offset is fixed.

---

## Rules for All Downstream Code

### Collector API (`collect.js`)
- `currentHourBucket()` MUST compute the current IST hour, not UTC.
- Formula: `new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 13)`
- The Redis key format is `stats:{domain}:{adUnit}:{urlHash}:{YYYY-MM-DDTHH}` where
  `YYYY-MM-DDTHH` is in IST.

### Hourly Flush Job (`hourlyFlush.js`)
- `isPastHour()` MUST compare against the current **IST** hour.
- Comparing against UTC would cause the flush to prematurely flush the
  current IST hour when it's between 18:30–23:59 UTC (= 00:00–05:30 IST next day).

### Dashboard Queries (`queries.ts`)
- **Do NOT apply** `AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'` to `hour_bucket`.
- Since the column already stores IST wall-clock, use it directly:
  - ✅ `DATE_TRUNC('hour', hour_bucket)`
  - ✅ `EXTRACT(HOUR FROM hour_bucket)`
  - ❌ `DATE_TRUNC('hour', (hour_bucket AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')`
    — this would add another +5:30, resulting in a +11:00 total offset for migrated rows.

### Dashboard Date Boundaries (`lib/ist.ts`)
- `startOfDay` / `endOfDay` from `date-fns` use the Node process's local timezone.
- On a UTC VPS, `startOfDay(now)` = 00:00 UTC = 05:30 IST — wrong for this system.
- Use `istStartOfDay()` / `istEndOfDay()` from `lib/ist.ts` instead.

---

## History

| Migration | What happened |
|-----------|---------------|
| `001_init.sql` | Created `ad_stats_hourly` with `hour_bucket TIMESTAMP NOT NULL`. Original design: UTC stored, dashboard converts to IST at query time. |
| `002_convert_utc_to_ist.sql` | Shifted all existing `hour_bucket` values by `+INTERVAL '5:30'` to IST wall-clock. Existing rows are now IST. New rows from collector were still UTC until the collector fix in this changeset. |
| `003_note.md` (this file) | No SQL. Documents the IST invariant. Collector and dashboard code updated to be consistent. |
