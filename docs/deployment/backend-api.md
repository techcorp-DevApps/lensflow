# Backend API Deployment (Railway)

The Express API lives in `server/` and is started by `npm run start:prod`, which builds the SPA and serves both the static frontend and `/api/*` on a single `PORT`.

## Railway service configuration

- **Build:** `npm install`
- **Start:** `npm run start:prod` (configured via `railway.toml` `startCommand`)
- **Healthcheck:** `GET /health` (configured via `railway.toml` `healthcheckPath`)
- **Port:** Railway provides `PORT`; the app binds to `0.0.0.0:$PORT`

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Set to `production` |
| `DATABASE_URL` | Postgres connection string (use the Railway PG plugin reference) |
| `JWT_SECRET` | Long random string for signing auth tokens |
| `APP_ORIGIN` | Comma-separated list of allowed CORS origins |
| `ADMIN_EMAIL` | Email of the initial admin user, seeded on first boot |
| `ADMIN_PASSWORD` | Password for the initial admin user |

## Optional environment variables

| Variable | Purpose |
| --- | --- |
| `ADMIN_NAME` | Display name for the seeded admin (defaults to `Administrator`) |
| `PGSSL` | Force SSL on the Postgres connection when `true` |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | Nodemailer SMTP configuration. When `SMTP_HOST` is empty, emails are logged instead of sent. |
| `STORAGE_PROVIDER` | `local` (default) or `s3` |
| `LOCAL_UPLOAD_DIR`, `PUBLIC_UPLOAD_BASE_URL` | Local storage paths |
| `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_ENDPOINT`, `STORAGE_FORCE_PATH_STYLE`, `STORAGE_PUBLIC_BASE_URL` | S3-compatible storage configuration |
| `OPENAI_API_KEY` | Wired up by the OpenAI proxy task |

## Migrations

The API runs SQL migrations from `server/migrations/` on boot and records applied files in the `schema_migrations` table, so deploys are idempotent.

## Smoke test

```bash
curl https://<your-railway-domain>/health
# -> { "ok": true, "service": "illuminate-studios-api", ... }
```

Authenticated routes require `Authorization: Bearer <jwt>`; obtain a token via `POST /api/auth/login` with the seeded admin credentials.
