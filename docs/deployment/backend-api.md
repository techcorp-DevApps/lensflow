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
| `OPENAI_API_KEY` | Required for the AI booking assistant |

## Access control model

The API enforces two access tiers:

### Admin-only endpoints (require `role === 'admin'`)

All CRUD/list/bulk operations on admin entities:

| Route group | Admin operations |
| --- | --- |
| `GET/POST/PUT/PATCH/DELETE /api/bookings` | List, create, update, delete (admin-only) |
| `GET/POST/PUT/PATCH/DELETE /api/contracts` | List, create, update, delete (admin-only) |
| `GET/POST/PUT/PATCH/DELETE /api/galleries` | List, create, update, delete (admin-only) |
| `GET/POST/PUT/PATCH/DELETE /api/gallery-images` | List, create, update, delete (admin-only) |
| `GET/POST/PUT/PATCH/DELETE /api/checklist-templates` | All operations (admin-only) |
| `GET/POST/PUT/PATCH/DELETE /api/shoot-checklists` | All operations (admin-only) |
| `GET/POST/PUT/DELETE /api/users` | All operations (admin-only) |

**Response for unauthorised callers:**
- No token → `401 Unauthorized`
- Non-admin token → `403 Forbidden` (never `404`, never silent redirect)

### Public / token-based exceptions

These endpoints are accessible without authentication to support customer token flows:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/bookings` | Anonymous booking request form |
| `GET /api/bookings/:id` | Client booking lookup by ID/token |
| `GET /api/contracts/:id` | Anonymous contract read |
| `PUT /api/contracts/:id` | Contract signing (restricted to `signature`, `signed_date`, `status` fields) |
| `GET /api/galleries/:id` | Client gallery read by ID |
| `GET /api/gallery-images` | Gallery image list by `gallery_id` |
| `PUT /api/gallery-images/:id` | Image selection toggle (restricted to `selected` field) |
| `POST /api/agents/conversations` | Start an anonymous booking chat |
| `GET /api/agents/conversations/:id` | Resume an anonymous booking chat |
| `POST /api/agents/conversations/:id/messages` | Send a message to the booking chat |

## Migrations

The API runs SQL migrations from `server/migrations/` on boot and records applied files in the `schema_migrations` table, so deploys are idempotent.

## Smoke test

```bash
curl https://<your-railway-domain>/health
# -> { "ok": true, "service": "illuminate-studios-api", ... }
```

Authenticated admin routes require `Authorization: Bearer <jwt>`; obtain a token via `POST /api/auth/login` with the seeded admin credentials.

```bash
# Get a token
curl -X POST https://<your-railway-domain>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"your-admin-password"}'

# Use the token
curl https://<your-railway-domain>/api/bookings \
  -H 'Authorization: Bearer <token>'
```
