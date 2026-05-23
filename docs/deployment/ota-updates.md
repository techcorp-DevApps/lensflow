# OTA updates (merge-to-main → Railway)

"OTA" here means: a code change shipped to production without any manual
build, upload, or deploy step. The pipeline is fully automated through
GitHub Actions and Railway.

## The flow

```
PR opened ──► CI (.github/workflows/ci.yml)
                ├─ lint
                ├─ typecheck
                ├─ unit tests (Vitest)
                ├─ e2e smoke (HTTP)
                ├─ build SPA
                └─ Playwright e2e

PR merged ──► Deploy (.github/workflows/deploy-railway.yml)
to main         ├─ validate: lint + typecheck + tests + build
                ├─ deploy:   railway link && railway up --ci
                └─ verify:   curl /health, /api/auth/me, /
```

A green `Deploy to Railway` workflow run = a live, working production site.
A red run = production is unchanged (Railway only rolls forward on a
successful `railway up`, and the verify job hard-fails on a broken site).

## Shipping a change

1. Open a PR. CI runs on every push; merge is blocked until it is green.
2. Merge to `main`. The `Deploy to Railway` workflow starts automatically.
3. Watch it in **Actions → Deploy to Railway**. The three jobs run in
   sequence: `validate → deploy → verify`.
4. When `verify` is green, the new build is serving traffic on the Railway
   public domain.

## Shipping a hotfix

1. Branch from `main`, make the smallest possible fix, push, open a PR.
2. Wait for CI to go green, then merge.
3. The deploy workflow takes over — typical turnaround is 4–7 minutes
   end-to-end (validate ~2 min, Railway build+deploy ~2–4 min, verify ~1 min).
4. If you cannot wait for the PR cycle, you may use **Actions → Deploy to
   Railway → Run workflow** on the `main` branch to redeploy the current
   `main` HEAD on demand. There is no separate "manual upload" path.

## Rolling back

There are two ways to revert:

1. **Code rollback (preferred):** `git revert <bad-commit>` on `main`. The
   deploy workflow ships the reverted commit automatically.
2. **Railway redeploy:** open the Railway service → **Deployments** → find
   the last known-good deployment → **Redeploy**. This skips the GitHub
   pipeline and pins production to that previous build until the next push
   to `main`.

Prefer (1) so the code on `main` always matches what is live.

## Why the verify job matters

Railway's own healthcheck runs against `/health`, which is enough to keep a
container alive. The `verify` job in GitHub Actions goes further:

- Confirms `/health` returns `{ "ok": true }` over the public URL.
- Confirms `/api/auth/me` returns `401` (the API is live, not 404'd by the
  SPA fallback or a misrouted reverse proxy).
- Confirms `/` returns the SPA HTML shell (not a blank page).

If any of those fail, the workflow is red even though Railway reports the
deploy as "successful". That is the early-warning signal — investigate the
service logs in Railway before assuming the site is fine.

## What you need configured once

- GitHub repository secrets per
  [`github-secrets.md`](./github-secrets.md).
- Railway environment variables per
  [`railway-env.md`](./railway-env.md).
- A Railway Postgres plugin attached to the service, with `DATABASE_URL`
  referencing it.

After that, every merge to `main` is an OTA update.

## Future hooks (out of scope today)

- A `staging` Railway environment with a `develop`-branch deploy workflow.
- Custom domain attached to the Railway service.
- Slack/Discord notifications on deploy success/failure.
