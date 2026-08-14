const redis = require('../redis-client');
const pool = require('../db/pool');

// Scans Redis for all "stats:*" keys using SCAN (not KEYS — KEYS blocks Redis
// on large datasets, SCAN is safe to run in production without freezing writes).
async function scanKeys(pattern) {
  const keys = [];
  let cursor = '0';
  do {
    const [nextCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
    cursor = nextCursor;
    keys.push(...foundKeys);
  } while (cursor !== '0');
  return keys;
}

// Only flush hours that have fully finished — never touch the current hour,
// since it's still being written to.
function isPastHour(hourBucket) {
  const currentHour = new Date().toISOString().slice(0, 13);
  return hourBucket < currentHour;
}

async function flushHourlyStats() {
  console.log('[flush] starting hourly flush job...');
  const keys = await scanKeys('stats:*');

  if (keys.length === 0) {
    console.log('[flush] no keys to flush');
    return;
  }

  let flushedCount = 0;
  let skippedCount = 0;

  for (const key of keys) {
    // key format: stats:{domain}:{adUnit}:{urlHash}:{hourBucket}
    const parts = key.split(':');
    if (parts.length < 5) continue;

    const hourBucket = parts[parts.length - 1];
    const uHash = parts[parts.length - 2];
    const adUnit = parts.slice(2, parts.length - 2).join(':'); // adUnit paths can contain ":"... but usually "/"
    const domain = parts[1];

    if (!isPastHour(hourBucket)) {
      skippedCount++;
      continue; // still the current hour, leave it in Redis for now
    }

    try {
      const counts = await redis.hgetall(key);
      const requests = parseInt(counts.requests || '0', 10);
      const filled = parseInt(counts.filled || '0', 10);
      const unfilled = parseInt(counts.unfilled || '0', 10);

      const pageUrl = await redis.get(`urlmap:${uHash}`);
      if (!pageUrl) {
        // URL mapping expired or missing — skip rather than write incomplete data
        skippedCount++;
        continue;
      }

      // hourBucket is like "2026-08-14T14" — convert to a real timestamp
      const hourTimestamp = `${hourBucket}:00:00Z`;

      await pool.query(
        `INSERT INTO ad_stats_hourly (domain, ad_unit, page_url, hour_bucket, requests, filled, unfilled)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (domain, ad_unit, page_url, hour_bucket)
         DO UPDATE SET
           requests = ad_stats_hourly.requests + EXCLUDED.requests,
           filled = ad_stats_hourly.filled + EXCLUDED.filled,
           unfilled = ad_stats_hourly.unfilled + EXCLUDED.unfilled`,
        [domain, adUnit, pageUrl, hourTimestamp, requests, filled, unfilled]
      );

      await redis.del(key);
      flushedCount++;
    } catch (err) {
      console.error(`[flush] error processing key ${key}:`, err.message);
    }
  }

  console.log(`[flush] done. flushed=${flushedCount} skipped(current hour)=${skippedCount}`);
}

module.exports = { flushHourlyStats };
