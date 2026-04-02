# Tengyunzi 24h Growth Agent Setup

This setup uses your existing Supabase tracking stack and does not require GA4.

## 1) What was added

- `public/js/site-visit-tracker.js`
  - Lightweight page-visit tracking for all public pages.
  - Sends `site_visit_track` to `admin-orders`.
- `scripts/inject-site-visit-tracker.mjs`
  - UTF-8 safe bulk injector for all `public/**/*.html`.
- `scripts/pull_growth_snapshot.mjs`
  - Pulls traffic + funnel from `admin-orders`.
  - If `ADMIN_DASHBOARD_TOKEN` is unavailable, it auto-falls back to `SUPABASE_SERVICE_ROLE_KEY` + PostgREST.
  - Computes score and policy.
  - Writes `data/growth_snapshot.json`.
- `supabase/functions/admin-orders/index.ts`
  - `site_visit_track` now stores UTM fields.
  - `site_visit_dashboard` now returns top UTM/source-medium aggregates.

## 2) Required environment variables

- Either one of:
  - `ADMIN_DASHBOARD_TOKEN` + `SUPABASE_ANON` (admin function mode)
  - `SUPABASE_SERVICE_ROLE_KEY` (direct PostgREST mode)
- `SUPABASE_URL` (auto-read from app.js if missing)
- Optional tuning:
  - `TRAFFIC_WINDOW_HOURS` (default `24`)
  - `TRAFFIC_WINDOW_HOURS_7D` (default `168`)
  - `FUNNEL_WINDOW_DAYS` (default `7`)
  - `TARGET_VISITS_24H` (default `300`)
  - `TARGET_ORDERS_7D` (default `30`)
  - `TARGET_PAID_RATE_PCT` (default `40`)
  - `TARGET_DELIVERED_RATE_PCT` (default `30`)

## 3) Run command

```powershell
node C:\Users\tgspc\bazi-app\scripts\pull_growth_snapshot.mjs
```

Output file:

`C:\Users\tgspc\bazi-app\data\growth_snapshot.json`

## 4) Deploy backend update (one-time)

```powershell
supabase functions deploy admin-orders --project-ref rcyssrsnalefzhzsvswm
```

## 5) Agent prompt integration

In your automation, run this command first each cycle:

```powershell
node C:/Users/tgspc/bazi-app/scripts/pull_growth_snapshot.mjs
```

Then read:

`C:/Users/tgspc/bazi-app/data/growth_snapshot.json`

Use `metrics`, `score.final_score`, and `policy` to decide:
- scale up
- keep and micro optimize
- reduce frequency
- pause and diagnose

## 6) Cloud run with GitHub Actions (no need to keep PC on)

Workflow file:

`C:\Users\tgspc\bazi-app\.github\workflows\growth-agent-hourly.yml`

Set these GitHub **Secrets** (Repo Settings -> Secrets and variables -> Actions):
- `SUPABASE_URL`
- `SUPABASE_ANON` (optional if you use service-role fallback only)
- `SUPABASE_SERVICE_ROLE_KEY` (recommended)
- `ADMIN_DASHBOARD_TOKEN` (optional, preferred mode if available)

Optional GitHub **Variables** (same page -> Variables):
- `TRAFFIC_WINDOW_HOURS`
- `TRAFFIC_WINDOW_HOURS_7D`
- `FUNNEL_WINDOW_DAYS`
- `TARGET_VISITS_24H`
- `TARGET_ORDERS_7D`
- `TARGET_PAID_RATE_PCT`
- `TARGET_DELIVERED_RATE_PCT`

After pushing to GitHub:
1. Open `Actions` tab.
2. Run `Growth Agent Hourly` once manually (`Run workflow`) to verify.
3. Then it will execute every hour automatically.
