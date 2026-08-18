const express = require('express');
const crypto = require('crypto');
const redis = require('../redis-client');

const router = express.Router();

// TTL for Redis keys — hourly flush job runs every hour, this gives it a safety buffer
const REDIS_KEY_TTL_SECONDS = 3 * 60 * 60; // 3 hours

function urlHash(url) {
  return crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
}

// Format: YYYY-MM-DDTHH in IST (GMT+5:30)
function currentHourBucket() {
  const now = new Date();
  // Offset UTC by +5h30m to get IST
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().slice(0, 13);
}

// Basic shape validation — reject junk before it touches Redis
function isValidPayload(body) {
  if (!body || typeof body !== 'object') return false;
  if (!body.domain || typeof body.domain !== 'string') return false;
  if (!body.pageUrl || typeof body.pageUrl !== 'string') return false;
  if (!Array.isArray(body.events) || body.events.length === 0) return false;
  if (body.events.length > 50) return false; // sanity cap — one page won't have 50 ad slots
  return true;
}

router.post('/collect', async (req, res) => {
  const body = req.body;

  if (!isValidPayload(body)) {
    // Respond 204 even on bad payloads — never give bots/scrapers useful error info,
    // and never let a malformed beacon retry-storm your server.
    return res.status(204).end();
  }

  // sendBeacon sends body as text/plain sometimes — handle both
  const domain = body.domain.trim().toLowerCase().slice(0, 255);
  const pageUrl = body.pageUrl.trim().slice(0, 2048);
  const hour = currentHourBucket();
  const uHash = urlHash(pageUrl);

  try {
    const pipeline = redis.pipeline();

    // Store the URL text once (cheap — overwritten each time, same value)
    pipeline.set(`urlmap:${uHash}`, pageUrl, 'EX', REDIS_KEY_TTL_SECONDS);

    for (const event of body.events) {
      if (!event.adUnit || typeof event.unfilled !== 'boolean') continue;

      const adUnit = String(event.adUnit).slice(0, 255);
      const key = `stats:${domain}:${adUnit}:${uHash}:${hour}`;

      pipeline.hincrby(key, 'requests', 1);
      pipeline.hincrby(key, event.unfilled ? 'unfilled' : 'filled', 1);
      pipeline.expire(key, REDIS_KEY_TTL_SECONDS);
    }

    await pipeline.exec();
    return res.status(204).end();
  } catch (err) {
    console.error('[collect] error writing to redis:', err.message);
    // Still respond 204 — the browser's sendBeacon doesn't care about the response,
    // and we don't want to leak internal errors either.
    return res.status(204).end();
  }
});

module.exports = router;
