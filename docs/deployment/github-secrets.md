# GitHub Actions Secrets — Railway deploy workflow

These secrets power `.github/workflows/deploy-railway.yml`. Add them under
**GitHub → Settings → Secrets and variables → Actions → New repository secret**.

> Nothing here is committed. The workflow only reads from `${{ secrets.* }}`.

## Required

| Secret | Where to find it in Railway | Used for |
| --- | --- | --- |
| `RAILWAY_TOKEN` | Railway dashboard → Account Settings → Tokens → **Create Token** (scope: account or team). | Authenticates the Railway CLI in CI. |
| `RAILWAY_PROJECT_ID` | Project → Settings → **Project ID** (also visible in the project URL). | Tells `railway link` which project to target. |
| `RAILWAY_ENVIRONMENT_ID` | Project → Environments → click the target env (e.g. `production`) → copy the ID from the URL or env settings. | Pins the deploy to a specific environment. |
| `RAILWAY_SERVICE` | Project → click the service (the one running `npm start`) → Settings → **Service name** (or ID). | Tells `railway up` which service to push code to. |
| `RAILWAY_PUBLIC_URL` | Service → Settings → Networking → **Public Networking** domain (e.g. `https://lensflow-production.up.railway.app`). Include the `https://` prefix and no trailing slash. | The `verify` job curls `/health`, `/api/auth/me`, and `/` against this URL so a green workflow guarantees a live, working site. The workflow **fails** if this secret is missing — reachability checks are mandatory. |

## One-time setup checklist

1. Generate a Railway token and paste it into `RAILWAY_TOKEN`.
2. Open the target Railway project and copy `RAILWAY_PROJECT_ID`,
   `RAILWAY_ENVIRONMENT_ID`, and `RAILWAY_SERVICE`.
3. Generate or copy the public domain from **Service → Settings → Networking**
   and paste it into `RAILWAY_PUBLIC_URL` (include the `https://` prefix, no
   trailing slash). The deploy workflow refuses to mark a run green without
   this — reachability verification is mandatory.
4. Trigger the deploy workflow from the **Actions** tab (`Run workflow`) and
   confirm all three jobs (`validate`, `deploy`, `verify`) finish green.

## Rotation

- Rotate `RAILWAY_TOKEN` if it ever lands in a log, a screenshot, or a chat.
  Revoke the old token in Railway after updating the GitHub secret.
- The project/environment/service IDs are not secrets in the cryptographic
  sense, but they are stored as secrets to keep CI config uniform.
