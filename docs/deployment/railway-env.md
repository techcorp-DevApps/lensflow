# Railway environment variables

Set these on the Railway **service** (the one running `npm start`) under
**Variables**. After editing, click **Deploy** so the running container picks up
the new values.

## Required

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | Set to `production`. Enables CORS allowlisting, JSON-only error responses, and triggers static SPA serving in `server/app.js`. |
| `PORT` | Provided automatically by Railway. The server binds `0.0.0.0:$PORT`; do not hardcode. |
| `DATABASE_URL` | Postgres connection string. Reference Railway's Postgres plugin (`${{Postgres.DATABASE_URL}}`) so the value tracks the plugin. |
| `JWT_SECRET` | Long random string (>= 32 chars) for signing auth tokens. Regenerate to invalidate every existing session. |
| `APP_ORIGIN` | Comma-separated list of allowed CORS origins. Include the public Railway domain (`https://<service>.up.railway.app`) and any custom domains. |
| `ADMIN_EMAIL` | Email of the initial admin user, seeded on first boot if no matching user exists. |
| `ADMIN_PASSWORD` | Password for the initial admin user. Rotate after first login. |

## Optional — AI assistant

| Variable | Notes |
| --- | --- |
| `OPENAI_API_KEY` | Required for the booking assistant. Without it, the agent endpoints return an explicit boot error. |

## Optional — Admin seed

| Variable | Notes |
| --- | --- |
| `ADMIN_NAME` | Display name for the seeded admin (defaults to `Administrator`). |

## Optional — Database TLS

| Variable | Notes |
| --- | --- |
| `PGSSL` | Set to `true` to force SSL on the Postgres connection. Railway Postgres uses TLS by default; leave unset for the bundled plugin. |

## Optional — Email (SMTP)

| Variable | Notes |
| --- | --- |
| `SMTP_HOST` | When empty, outbound emails are logged to stdout instead of sent. |
| `SMTP_PORT` | Typically `587` (STARTTLS) or `465` (TLS). |
| `SMTP_SECURE` | `true` for port 465, otherwise `false`. |
| `SMTP_USER` / `SMTP_PASSWORD` | SMTP credentials. |
| `EMAIL_FROM` | The `From:` header used for outbound mail. |

## Optional — File uploads

| Variable | Notes |
| --- | --- |
| `STORAGE_PROVIDER` | `local` (default) or `s3`. Railway's filesystem is ephemeral, so use `s3` for any persistent uploads. |
| `LOCAL_UPLOAD_DIR` | Directory for local uploads (only used when `STORAGE_PROVIDER=local`). |
| `PUBLIC_UPLOAD_BASE_URL` | Public URL prefix served by `/uploads`. |
| `STORAGE_BUCKET` | S3 bucket name. |
| `STORAGE_REGION` | S3 region. |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | S3 credentials. |
| `STORAGE_ENDPOINT` | Override for S3-compatible providers (R2, MinIO, etc.). |
| `STORAGE_FORCE_PATH_STYLE` | `true` for S3-compatible providers that require path-style URLs. |
| `STORAGE_PUBLIC_BASE_URL` | Public URL prefix for objects stored in the bucket. |

## Verifying the configuration

After saving variables and redeploying:

```bash
curl https://<railway-domain>/health
# -> {"ok":true,"service":"illuminate-studios-api","database":true,...}

curl -i https://<railway-domain>/api/auth/me
# -> HTTP/1.1 401 Unauthorized  (API is live, no token attached)

curl -I https://<railway-domain>/
# -> HTTP/1.1 200 OK  Content-Type: text/html  (SPA shell)
```

If `database` is `false` in `/health`, `DATABASE_URL` is not wired. If `/`
returns 404, the build phase did not produce `dist/` — check the Railway build
logs for `npm run build` failures.
