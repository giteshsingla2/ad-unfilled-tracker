/**
 * IST (Asia/Kolkata, UTC+5:30) date-boundary helpers.
 *
 * Why this file exists:
 *   The DB stores hour_bucket as IST wall-clock timestamps (TIMESTAMP WITHOUT
 *   TIME ZONE).  Date-range queries must therefore use IST midnight / 23:59:59
 *   as boundaries, not the server's local midnight (which, on a UTC VPS, would
 *   be 05:30 IST — causing ~5.5 h of each day to fall into the wrong bucket).
 *
 *   We use Intl.DateTimeFormat to determine the current date in IST without
 *   adding any npm dependency.
 */

const IST_TZ = 'Asia/Kolkata';

/**
 * Returns a Date representing 00:00:00.000 IST on the calendar day of `date`,
 * expressed as a UTC instant.
 *
 * Example: if `date` is 2026-08-21T01:00:00Z (= 2026-08-21 06:30 IST),
 * the return value is 2026-08-20T18:30:00.000Z (= 2026-08-21 00:00:00 IST).
 */
export function istStartOfDay(date: Date): Date {
  // Get the IST calendar parts for this instant
  const parts = getISTParts(date);
  // Reconstruct as if it were UTC (which matches what PG stores for IST wall-clock)
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0) - IST_OFFSET_MS
  );
}

/**
 * Returns a Date representing 23:59:59.999 IST on the calendar day of `date`,
 * expressed as a UTC instant.
 */
export function istEndOfDay(date: Date): Date {
  const parts = getISTParts(date);
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999) - IST_OFFSET_MS
  );
}

/**
 * Returns a Date representing the current instant in UTC,
 * with the wall-clock time shifted so that getISTHour() works correctly.
 * Mostly a convenience alias for callers that want "now in IST context".
 */
export function istNow(): Date {
  return new Date();
}

/**
 * Returns the current IST hour-bucket string in the format "YYYY-MM-DDTHH",
 * matching the format written by collect.js.
 */
export function currentISTHourBucket(): string {
  return toISTWallClock(new Date()).slice(0, 13);
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** IST offset: +5h 30m = 19800 seconds = 19800000 ms */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

interface ISTParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
}

function getISTParts(date: Date): ISTParts {
  // Intl gives us the IST calendar breakdown without any tz library
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
  };
}

/**
 * Returns the ISO-8601 string of `date` as IST wall-clock time,
 * e.g. "2026-08-21T21:30:00.000Z" for a moment that is 21:30 in IST.
 * (The "Z" suffix here is a lie — it's actually IST — but the format
 * matches what collect.js writes into Redis/Postgres.)
 */
function toISTWallClock(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString();
}
