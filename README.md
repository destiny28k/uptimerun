# Upbeat: uptime monitoring

Astro + Tailwind, hosted on Cloudflare Workers with a D1 database.

## How it works
- **Website and dashboard:** Astro pages, server-rendered on the Worker.
- **Login:** Better Auth, passwordless: an email magic link (15 minutes, single use) plus Google and GitHub. Sessions are stored in D1. On signup the user types a website, and `/dashboard/welcome` creates that monitor after they sign in. Routes are in `src/pages/api/auth/[...all].ts`, and `src/middleware.ts` protects `/dashboard`.
- **Checker:** `src/worker.ts` exports `scheduled()`, which runs every minute (cron in `wrangler.jsonc`) and calls `runChecks` in `src/lib/checker.ts`.
  - It checks every monitor that is due, up to 400 per run, with a 30-second timeout.
  - A site counts as **down after 2 failed checks in a row**. Failures are re-checked after 1 minute.
  - It only writes up/down changes as incidents. It also keeps the last 60 results on each monitor and daily uptime totals in `daily_stats`.
- **Domain and SSL expiry:** `src/lib/expiry.ts` refreshes each monitor once a day, checking up to 15 monitors per cron run. It uses free public sources with no keys:
  - **Domain:** RDAP through rdap.org. Some extensions, such as .co and .in, don't publish expiry dates this way.
  - **SSL:** Certificate Transparency logs from Cert Spotter, with crt.sh as a backup.
  - It alerts at 30, 14, 7 and 1 day before expiry, once per threshold, and resets after a renewal.
  - Cert Spotter's free, unauthenticated limit is small. At scale, get a free API key or switch to a scheduled job that reads the certificate directly.
- **Alerts:** `src/lib/alerts.ts` sends email (Resend) and Telegram messages. If a user has no alert contacts, alerts go to their account email. Without API keys, alerts are logged instead of sent.

## Local development
```
copy .dev.vars.example .dev.vars   # then set BETTER_AUTH_SECRET
npm run db:migrate:local
npm run dev                         # http://localhost:4330
```
To trigger the checker locally, open `http://localhost:4330/cdn-cgi/handler/scheduled` (Wrangler's scheduled test route).

## Social logins (Google, GitHub)
Each provider gives a free Client ID and Secret. Put them in `.dev.vars` locally, then restart `npm run dev`. In production, add them with `wrangler secret put`. The callback URL is `<APP_URL>/api/auth/callback/<provider>`, for example `http://localhost:4330/api/auth/callback/google`.

- **Google:** [console.cloud.google.com](https://console.cloud.google.com) → create a project → APIs & Services → OAuth consent screen (External, app name, support email) → Credentials → Create credentials → OAuth client ID → Web application.
  - Authorized JavaScript origin: `http://localhost:4330`
  - Redirect URI: `http://localhost:4330/api/auth/callback/google`
- **GitHub:** github.com → Settings → Developer settings → OAuth Apps → New OAuth App.
  - Homepage: `http://localhost:4330`
  - Callback: `http://localhost:4330/api/auth/callback/github`
  - Then click "Generate a new client secret".

When you go live, add the real domain's URLs in each provider as well.

## Going live (later)
1. `npx wrangler d1 create upbeat`, then put the returned `database_id` in `wrangler.jsonc`.
2. `npm run db:migrate:remote`
3. Secrets: `npx wrangler secret put BETTER_AUTH_SECRET`, plus `RESEND_API_KEY` and `TELEGRAM_BOT_TOKEN`.
4. Set `APP_URL` and `EMAIL_FROM` in `wrangler.jsonc` to the real domain.
5. `npm run deploy`

## Not built yet
Payments (Pro plan), status pages, Slack/Discord/SMS, SSL and domain expiry checks, multi-location confirmation, and languages.
