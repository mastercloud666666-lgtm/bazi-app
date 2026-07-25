# Deploy

This site is **two independently deployed systems that reference each other by URL**:

| System | Serves | Deployed by |
| --- | --- | --- |
| **Vercel** | the static pages in `public/` (`tengyunzi-report.html`, the report/checkout return pages, etc.) | `git push` to `main`, or `vercel --prod` |
| **Supabase** | the Edge Functions (`paypal` decides which page a payment returns to; `analyze`/`english-report` generate reports) | `supabase functions deploy` |

Nothing keeps the two in sync automatically. A change that touches both — which the
English-only migration did — is only safe if it is deployed in the right order.

## The golden rule: Supabase before Vercel

The **function** decides which page a paid buyer is sent back to. Whether that page
**exists** is decided by **Vercel**. So the function must never point at a page Vercel
has already removed.

```
✅  deploy Supabase first
      → paypal now returns tengyunzi-report.html
      → Vercel still old, but tengyunzi-report.html already exists there → fine
    deploy Vercel second
      → result.html etc. removed, but nothing points at them any more → no effect

❌  deploy Vercel first
      → paypal (still old) returns result.html
      → result.html already deleted from Vercel → 404
      → every non-AI payment in the gap lands on a dead page after paying
```

There is a `vercel.json` 301 from `result.html` → `tengyunzi-report.html` as a safety
net, but do **not** rely on it: a redirect drops the `?trade_no=...&pp=1` query string,
and that is exactly what the report page needs to claim the order. The net catches stray
old links; it does not catch a buyer mid-checkout.

## Order of operations

### 0. Log in and confirm the target project

```bash
supabase login                 # needs your Supabase access token (interactive)
cd ~/bazi-app
supabase link --project-ref rcyssrsnalefzhzsvswm   # already linked; re-run only if prompted
```

`rcyssrsnalefzhzsvswm` is the project the live frontend points at (`public/js/*.js`).
Confirm before deploying — deploying to the wrong project is silent and hard to notice.

### 1. Database migrations (before functions that depend on them)

`account-delete` writes to `account_deletion_log`, created by
`supabase/migrations/202607250900_account_deletions.sql`. Deploy the function before the
table exists and self-service deletion will fail at runtime.

```bash
supabase db push
```

### 2. Edge Functions (Supabase) — before Vercel

Deploy only the functions this migration changed. Naming them explicitly avoids
redeploying anything unrelated:

```bash
supabase functions deploy paypal admin-orders analyze \
  contact-submit newsletter-subscribe order-intake account-delete
```

- `paypal`, `admin-orders` — payment return paths moved off the deleted Chinese pages. **These two are the reason the order matters.**
- `analyze`, `contact-submit`, `newsletter-subscribe`, `order-intake` — Chinese user-facing strings removed / form timing check added.
- `account-delete` — new; must come after step 1.

**Do NOT redeploy or delete the retired CNY functions here** (`create-payment`,
`payment-callback`, `reconcile-payment`, `wecom-callback`). Their source is archived
under `_zh-archive/`, so `supabase functions deploy` cannot touch them by name and a
bulk deploy would skip them — they stay live-but-unused, which is the intended state.
Retiring them for real is a separate, deliberate step (see "Later" below).

### 3. Static site (Vercel) — last

Merging `chore/english-only-cleanup` (and the `pwa-and-account-delete` work on top of it)
into `main` triggers the production build. Only do this **after** step 2 reports success.

```bash
# via PR (preferred): merge chore/english-only-cleanup, then pwa-and-account-delete
# or directly:
git checkout main && git merge --ff-only pwa-and-account-delete && git push origin main
```

Prefer a PR so a Vercel **Preview** deployment renders before production.

## Verify after deploying

1. `supabase functions list` — confirm the seven above show a fresh **Updated** time.
2. Real sandbox payment (or PayPal sandbox): approve, confirm the return lands on
   `tengyunzi-report.html?trade_no=...` and the report is claimed — **not** a 404.
3. `curl -sI https://www.tengyunzi.com/result.html` — expect the `vercel.json` 301, not a 200.
4. Contact + newsletter forms still submit (the form-timing check rejects sub-second posts;
   a human is well over the threshold).

## Rollback

- **Functions:** redeploy the previous version from `git checkout origin/main -- supabase/functions/<name>` then `supabase functions deploy <name>`. Supabase keeps no version history for you — git is the source of truth.
- **Static:** in the Vercel dashboard, promote the previous production deployment. Instant, no rebuild.
- Roll back **Vercel first** if you have to (put the old pages back), then functions — the reverse of deploy order, for the same reason.

## Later (separate, deliberate actions — not part of this deploy)

- **Retire the CNY payment path:** `supabase functions delete create-payment payment-callback reconcile-payment wecom-callback`. Check for unreconciled CNY orders before deleting `reconcile-payment`.
- **Daily PayPal reconcile workflow** (`.github/workflows/paypal-reconcile-daily.yml`) needs GitHub secrets `ADMIN_DASHBOARD_TOKEN` (orders scope) and optionally `RECONCILE_NOTIFY_WEBHOOK`, or it fails every run.
- **Rotate the leaked tokens** if not already done (Vercel PAT, Anthropic key that were in `.claude/settings*.json`).
