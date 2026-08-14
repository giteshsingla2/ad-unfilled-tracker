const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const collectRoute = require('./routes/collect');
const { flushHourlyStats } = require('./jobs/hourlyFlush');

const app = express();

// Tell Express to trust the X-Forwarded-For header from exactly one hop in front
// of it (ngrok locally, and later your VPS's reverse proxy/Nginx). This lets
// express-rate-limit correctly identify each real visitor's IP instead of treating
// every request as coming from the proxy itself. Using `1` (not `true`) is the
// safer setting — it trusts only the immediate proxy, not the whole forwarding chain.
app.set('trust proxy', 1);

// sendBeacon sometimes sends as text/plain — accept both
app.use(express.json({ type: ['application/json', 'text/plain'] }));

// Allow requests from any of your sites (tighten this to your actual domains in production).
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type'],
}));

// Basic protection — one site sending way more than expected gets throttled,
// not the whole system falling over. Tune per your real traffic.
const collectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6000, // generous — batched requests, not per-impression, so this is plenty
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', collectLimiter, collectRoute);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] collector API running on port ${PORT}`);
});

// Runs at minute 5 of every hour — gives a 5 min buffer past the hour boundary
// so any late-arriving beacons from the previous hour still land in Redis first.
cron.schedule('5 * * * *', () => {
  flushHourlyStats().catch((err) => console.error('[cron] flush failed:', err));
});

console.log('[server] hourly flush job scheduled (runs at :05 past every hour)');