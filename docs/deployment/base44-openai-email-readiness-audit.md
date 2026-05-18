# Base44 Reliance + OpenAI Booking/Email Readiness Audit

_Date: 2026-05-18 (UTC)_

## Scope checked

- Backend runtime + routes under `server/`
- Agent configuration under `agents/booking_assistant/`
- Deployment docs + env docs under `docs/deployment/` and `docs/openai-agent-config.md`

## Findings: Base44 reliance

### Backend runtime

- **No direct Base44 runtime dependency found in backend code paths.**
- Booking agent routing (`server/routes/agents.js`) calls OpenAI directly via server proxy and local tools (`server/agent-tools.js`).
- Entity CRUD routes are first-party Express + Postgres (`server/routes/entities.js`, `server/routes/entity-factory.js`).

### Docs/config residual references

- `docs/api-migration.md` still contains many Base44 references, but it is explicitly a migration/removal guide rather than active runtime configuration.
- Frontend compatibility layer still uses a local object named `base44` (`src/components/api/base44Client.js`, re-exported by `src/api/base44Client.js`). This appears to be naming-only shim code to call first-party API endpoints, not Base44 service usage.

## Findings: OpenAI booking agent write readiness

### Current state

- Agent tool schema includes `submit_booking_request` in `agents/booking_assistant/config.json`.
- Server-side implementation `runSubmitBookingRequest` persists a `bookings` row (`INSERT INTO bookings ... status='pending'`) in `server/agent-tools.js`.
- Writes are guarded by:
  - Allowed session type validation
  - Valid ISO date-time check
  - Conversation-scoped idempotency (`booking_submitted_id`)
  - Draft-first + post-draft user confirmation gates
- Agent route enforces server-side OpenAI key presence and runs tool calls server-side (`server/routes/agents.js`, `server/openai-client.js`).

### Gap to satisfy “OpenAI booking write permissions”

1. **No explicit environment-level feature flag/permission control for booking writes.**  
   Current behavior is effectively “enabled if tool is present + DB writable.” If you need auditable permission control, add a dedicated gate (e.g., `AGENT_ALLOW_BOOKING_WRITES=true`) in `runSubmitBookingRequest`.
2. **No role-based policy differentiation for anonymous booking-chat callers.**  
   Anonymous conversations are allowed; tool write authority is model+prompt constrained, not policy-scoped by actor type.
3. **No explicit operational readiness check endpoint for agent write capability.**  
   `/health` doesn’t assert OpenAI connectivity or write-path dry-run status.

## Findings: Outbound email wiring readiness

### Current state

- `/api/integrations/email/send` exists (`server/routes/integrations.js`) and uses Nodemailer SMTP transport.
- Required SMTP envs are documented (`docs/deployment/backend-api.md`, `docs/deployment/railway-env.md`).
- Fallback behavior when `SMTP_HOST` missing: returns `ok: true, delivered: false, reason: smtp_not_configured` and logs only.

### Gaps to satisfy “external email sending”

1. **Not externally sending by default.**  
   Without `SMTP_HOST`, system only logs email payload metadata.
2. **No startup validation that email is truly production-ready.**  
   App can boot with incomplete SMTP config (`EMAIL_FROM`, auth creds), so email path may fail only at send time.
3. **No provider health-check/verification endpoint.**  
   There is no built-in SMTP test route or boot-time transporter verify.
4. **No retry/queue strategy.**  
   Transient SMTP failures return request-time errors; no durable retry/outbox.

## Recommended minimum actions

1. Add `AGENT_ALLOW_BOOKING_WRITES` guard in `runSubmitBookingRequest` and document required value for production.
2. Add boot-time config validation:
   - Fail-fast in production if `OPENAI_API_KEY` missing (already done).
   - Fail-fast (or at least warning with severity) when email sending is expected but SMTP vars are incomplete.
3. Add operational checks:
   - A readiness endpoint section for OpenAI agent + booking write path
   - Optional SMTP transporter `verify()` check exposed to admins.
4. For production email reliability, add retry queue/outbox semantics (DB-backed or job-queue).

## Pass/fail snapshot

- **Base44 backend runtime dependence:** PASS (none detected)
- **OpenAI booking write path implemented:** PASS
- **OpenAI booking write permissioning controls (explicit/auditable):** GAP
- **External SMTP email delivery readiness (strict):** GAP unless SMTP env/config is fully set and validated
