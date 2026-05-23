# Project Overview

Photography business management platform (Lensflow) — a React + Vite SPA for photographers to manage bookings, contracts, checklists, and client galleries, with an AI-powered booking assistant.

## Tech Stack

- **Frontend:** React 18 + Vite 6
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI primitives)
- **State:** TanStack React Query + React Context
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod
- **AI:** OpenAI API
- **Payments:** Stripe
- **Charts:** Recharts

## Access Control Model

The app has two distinct surfaces with no overlap:

| Surface | URL namespace | Access model |
|---|---|---|
| Admin cockpit | `/admin/*` | Requires login + `role === 'admin'` |
| Public customer surface | `/`, `/booking-request`, `/book`, `/gallery/:id`, `/sign/:id`, `/client-booking/:id` | Public or token-based; no login required |

### Admin routes
All admin pages live under `/admin/*` and are protected by `RequireAdmin`:
- `/admin/login` — admin sign-in
- `/admin/dashboard`
- `/admin/bookings`
- `/admin/contracts`
- `/admin/galleries`
- `/admin/checklists`
- `/admin/reminders`

The legacy `/login` and `/dashboard` (etc.) paths permanently redirect to their `/admin/*` equivalents.

### Public customer routes
These routes are accessible without authentication and render no admin navigation:
- `/` — public landing page with booking CTAs and a low-emphasis photographer sign-in link
- `/booking-request` (alias `/request`) — anonymous booking request form
- `/book` — AI booking assistant chat
- `/gallery/:id` (alias `/client-gallery/:id`) — client gallery access by token/password
- `/sign/:id` (alias `/sign-contract/:id`) — contract signing by token
- `/client-booking/:id` (alias `/booking-status`) — booking status lookup by token

### API access control
Admin entity API endpoints (`/api/bookings`, `/api/contracts`, `/api/galleries`, etc.) require `role === 'admin'`:
- Unauthenticated requests → `401 Unauthorized`
- Authenticated non-admin requests → `403 Forbidden`
- Authenticated admin requests → expected `2xx`

**Public API exceptions preserved:**
- `POST /api/bookings` — anonymous booking request
- `GET /api/bookings/:id` — anonymous booking lookup by ID
- `GET /api/contracts/:id` — anonymous contract read
- `PUT /api/contracts/:id` — anonymous contract sign (signing fields only)
- `GET /api/galleries/:id` — anonymous gallery read
- `GET/PUT /api/gallery-images/:id` — anonymous image selection toggle
- `POST /api/agents/conversations` + messages — anonymous booking chat

### Creating the first admin user
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables. On first boot, the server seeds an admin user with those credentials if no matching user exists. Additional admin users can be created via `POST /api/users` with an admin JWT.

### Customer accounts
Full customer accounts (customer login, customer dashboards) are **out of scope** and have not been implemented. Customers access their content via tokenised links only.

## User Preferences

- All dependencies must remain platform-independent. Do not introduce or rely on any Replit-specific packages, SDKs, or services. Every dependency must work in any standard Node.js environment.
- This project is intended for Railway deployment. Build and run commands must be compatible with Railway / Nixpacks. Do not assume Replit hosting for production.
- AI agent integrations must be built using the OpenAI API directly. Do not use Replit AI APIs or any other vendor-specific AI SDK.
- GitHub Actions workflows should be used for CI/CD and OTA updates. Automate deployments through GitHub, not through Replit's deploy tooling.
- The dev server must run on `0.0.0.0:5000` with `allowedHosts: true` in Vite config so the Replit preview proxy works during development.

## Backend API (Railway)

A first-party Node + Express + PostgreSQL API lives in `server/`. It exposes `/api/*` for the SPA and runs on `process.env.PORT`.

### Scripts

- `npm run dev` — Vite dev server (frontend, port 5000) + Express API (port 3000) via concurrently
- `npm run dev:frontend` — Vite dev server only (port 5000)
- `npm run dev:server` — API in watch mode (port 3000 by default)
- `npm start` — production API entry (`node server/server.js`)
- `npm run start:prod` — builds the SPA and serves it from the API on a single `PORT` (used by Railway)
- `npm test` — supertest + vitest unit tests (skipped automatically when `DATABASE_URL` is unset for server tests)

### Required production environment variables

- `DATABASE_URL` — Postgres connection string (Railway PG service)
- `JWT_SECRET` — long random string for signing auth tokens
- `APP_ORIGIN` — comma-separated list of allowed CORS origins
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — seeded on first boot if no matching user exists

### Optional environment variables

- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_FROM` — outbound email; when unset, emails are logged instead of sent
- `STORAGE_PROVIDER` (`local` or `s3`) plus the matching `STORAGE_*` vars — file upload backend
- `OPENAI_API_KEY` — required for the AI booking assistant
- `OPENAI_MODEL` — optional override for the booking assistant model. Defaults to `gpt-5-nano` (OpenAI's latest fastest tier). If the account does not yet have access to `gpt-5-nano`, set this to `gpt-4.1-nano` as a fallback. The model name is also mirrored in `agents/booking_assistant/config.json`; the env var wins when set.

See `.env.example` for the full list.

### Deployment & OTA

- `docs/deployment/github-secrets.md` — GitHub Actions secrets checklist.
- `docs/deployment/railway-env.md` — Railway service environment variables.
- `docs/deployment/ota-updates.md` — merge-to-main → Railway deploy flow.

Production runs `npm start` (built by `npm ci && npm run build` in the Nixpacks build phase). Healthcheck is `GET /health`.

## Frontend environment variables

The browser bundle reads only `VITE_*` variables. None of them may contain a secret — anything prefixed with `VITE_` is shipped to the client.

- `VITE_API_BASE_URL` — base URL for the API. Defaults to `/api` (same-origin production builds). In split dev, point this at the API host (e.g. `http://localhost:3000/api`).

`VITE_OPENAI_API_KEY` is **not** read by the client. The OpenAI key lives only on the server as `OPENAI_API_KEY` and is used by the server-side proxy.

## Auth flow

- `/admin/login` posts to `/api/auth/login` and stores the returned JWT in `localStorage` (`auth_token`).
- Authenticated admin routes are wrapped in `<RequireAdmin />`.
  - Unauthenticated visits → redirect to `/admin/login?from=<original-path>`.
  - Authenticated non-admin visits → no-access page (sign out + link to customer site).
  - Authenticated admin visits → render the admin cockpit.
- Logout clears the JWT and returns the user to the public landing page at `/`.
- Public routes (no auth needed): `/`, `/booking-request`, `/request`, `/book`, `/gallery/:id`, `/client-gallery/:id`, `/sign/:id`, `/sign-contract/:id`, `/client-booking/:id`, `/booking-status`.
