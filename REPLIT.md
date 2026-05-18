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
