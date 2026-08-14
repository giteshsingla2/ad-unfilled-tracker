# Ad Tracker Monorepo — Local Setup (Mac, no Docker)

## Structure

```
ad-tracker-monorepo/
├── apps/
│   ├── collector-api/     ← Node.js server (build now)
│   ├── dashboard/         ← Next.js app (build next, empty for now)
│   └── wordpress-plugin/  ← WP plugin (already built)
├── packages/
│   └── db/migrations/     ← shared Postgres schema, used by both apps
└── package.json           ← npm workspaces root
```

No Docker needed — Postgres and Redis run as lightweight native Homebrew
services. Combined they're well under 100MB, versus Docker Desktop which is
often 1-2GB+ on its own — a better fit given your storage constraints.

## One-time setup

1. Install Postgres and Redis via Homebrew (skip any you already have):
   ```
   brew install postgresql@16 redis
   ```

2. Start them as background services (they'll also auto-start on login,
   using barely any resources when idle):
   ```
   brew services start postgresql@16
   brew services start redis
   ```
   Check they're running:
   ```
   brew services list
   ```
   Both should show `started`.

3. Make sure the Postgres CLI tools are on your PATH (Homebrew installs them
   under a versioned path that isn't always linked automatically):
   ```
   echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

4. Create the database:
   ```
   createdb ad_tracker
   ```

5. Install root dependencies:
   ```
   cd ad-tracker-monorepo
   npm install
   ```

6. Run the schema migration:
   ```
   npm run db:migrate
   ```

7. Set up collector's environment file:
   ```
   cd apps/collector-api
   cp .env.example .env
   ```
   With native Homebrew Postgres, your Mac username is usually the default
   superuser and no password is needed. Edit `.env` to:
   ```
   PG_HOST=127.0.0.1
   PG_PORT=5432
   PG_USER=your_mac_username
   PG_PASSWORD=
   PG_DATABASE=ad_tracker

   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   ```
   (Run `whoami` in Terminal if you're not sure of your Mac username.)

8. Install collector dependencies and start it:
   ```
   cd apps/collector-api
   npm install
   cd ../..
   npm run collector:dev
   ```

9. Verify:
   ```
   curl http://localhost:3001/health
   ```

## Everyday workflow (no Docker commands needed)

Since Postgres/Redis run as background `brew services`, you don't need to
start/stop them each session — they just stay running in the background
(minimal resource use when idle). If you ever want to stop them to free up
resources:
```
brew services stop postgresql@16
brew services stop redis
```
And start again later:
```
brew services start postgresql@16
brew services start redis
```

## Point a real WordPress site at your local collector (for testing)

Since your local Mac server isn't publicly reachable, use a tunnel tool like
`ngrok` or `cloudflared` temporarily so a real WordPress site can reach it:

```
ngrok http 3001
```

This gives you a temporary public URL (e.g. `https://abc123.ngrok.app`).
Put `https://abc123.ngrok.app/api/collect` into the WordPress plugin's
Collector API URL setting. Now real ad events from that live site will flow
into your local Redis/Postgres — perfect for testing before you deploy
anything to the VPS.

## Checking data landed

```
psql -d ad_tracker -c "SELECT * FROM ad_stats_hourly ORDER BY hour_bucket DESC LIMIT 10;"
```

## When you're ready to deploy to your VPS

Your VPS will very likely run Ubuntu, where Postgres and Redis install just
as natively (and lightly) via `apt`:
```
sudo apt install postgresql redis-server
```
Same `.env` setup applies — just point it at the VPS's local Postgres/Redis,
point your WordPress sites' collector URL at the VPS's real domain instead
of ngrok, and keep the collector process alive with `pm2`.
