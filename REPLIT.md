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

## User Preferences

- All dependencies must remain platform-independent. Do not introduce or rely on any Replit-specific packages, SDKs, or services. Every dependency must work in any standard Node.js environment.
- This project is intended for Railway deployment. Build and run commands must be compatible with Railway / Nixpacks. Do not assume Replit hosting for production.
- AI agent integrations must be built using the OpenAI API directly. Do not use Replit AI APIs or any other vendor-specific AI SDK.
- GitHub Actions workflows should be used for CI/CD and OTA updates. Automate deployments through GitHub, not through Replit's deploy tooling.
- The dev server must run on `0.0.0.0:5000` with `allowedHosts: true` in Vite config so the Replit preview proxy works during development.

## Backend API (Railway)

A first-party Node + Express + PostgreSQL API lives in `server/`. It exposes `/api/*` for the SPA and runs on `process.env.PORT`.

### Scripts

- `npm run dev` — Vite dev server (frontend, port 5000)
- `npm run dev:server` — API in watch mode (port 3000 by default)
- `npm start` — production API entry (`node server/server.js`)
- `npm run start:prod` — builds the SPA and serves it from the API on a single `PORT` (used by Railway)
- `npm test` — supertest smoke test (skipped automatically when `DATABASE_URL` is unset)

### Required production environment variables

- `DATABASE_URL` — Postgres connection string (Railway PG service)
- `JWT_SECRET` — long random string for signing auth tokens
- `APP_ORIGIN` — comma-separated list of allowed CORS origins
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — seeded on first boot if no matching user exists

### Optional environment variables

- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_FROM` — outbound email; when unset, emails are logged instead of sent
- `STORAGE_PROVIDER` (`local` or `s3`) plus the matching `STORAGE_*` vars — file upload backend
- `OPENAI_API_KEY` — wired up by the OpenAI proxy task

See `.env.example` for the full list and `docs/api-migration.md` for the API contract.
