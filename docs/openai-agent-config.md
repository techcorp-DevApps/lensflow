# OpenAI agent integration (Booking Assistant)

The booking assistant runs entirely **server-side**. The OpenAI API key never
ships to the browser and is consumed only by the server-side proxy.

## Architecture

1. The frontend (`src/pages/BookingChat.jsx`) talks to first-party endpoints:
   - `POST /api/agents/conversations` — start a conversation
   - `GET  /api/agents/conversations/:id` — resume a conversation
   - `POST /api/agents/conversations/:id/messages` — append a user message and
     receive an assistant reply (JSON)
   - `POST /api/agents/conversations/:id/messages?stream=1` — same, but the
     assistant deltas are streamed via Server-Sent Events. **Contract:** on
     a `?stream=1` request the server either responds with
     `Content-Type: text/event-stream` (and the user message has been
     persisted) or returns a non-2xx / non-SSE response (and the user
     message has NOT been persisted). The client uses the response
     content-type to detect a misconfigured proxy and falls back to the
     plain JSON endpoint safely — without ever double-submitting the user
     message or duplicating booking creation.
2. The server (`server/routes/agents.js`) loads the agent definition from
   `agents/booking_assistant/` (system prompt, tools), calls the OpenAI Chat
   Completions API with `tools`, runs server-side tool calls against the
   Postgres entity layer, and persists every turn into the `agent_conversations`
   and `agent_messages` tables.
3. Tool calls available to the assistant:
   - `check_availability({ date })` — looks at the `bookings` table for the day
   - `draft_booking({...})` — returns a normalised draft for client review
   - `submit_booking_request({...})` — inserts a `bookings` row with
     `status='pending'`. The system prompt requires explicit client confirmation
     before this tool fires.

## Server environment (required)

The OpenAI key lives **only** on the server. Set these on the API process
(Railway service env vars):

- `OPENAI_API_KEY` — production OpenAI secret. **Required in production**;
  the server fails to boot without it when `NODE_ENV=production`.
- `OPENAI_PROJECT_ID` *(optional)* — project-scoped key target.
- `OPENAI_ORG_ID` *(optional)* — organisation id for billing/routing.
- `OPENAI_MODEL` *(optional)* — overrides the default model
  (`gpt-4o-mini`).
- `AGENT_RATE_LIMIT_PER_MIN` *(optional, default 20)* — conversation create
  rate cap per user/IP.
- `AGENT_MESSAGE_RATE_LIMIT_PER_MIN` *(optional, default 30)* — message rate
  cap per user/IP.

## Frontend (optional, non-secret)

The booking chat may forward non-secret OpenAI project metadata to the server
inside the conversation `metadata.integration` payload so the proxy can pick
the right project context:

- `VITE_OPENAI_PROJECT_NAME` — e.g. `lensflow`
- `VITE_OPENAI_PROJECT_ID` — e.g. `proj_xxx`

Both are optional. **Never** put `OPENAI_API_KEY` (or any secret) behind a
`VITE_` prefix — anything `VITE_*` is bundled into the public JS shipped to
browsers. The legacy `VITE_OPENAI_API_KEY` is no longer read anywhere in the
client and should be removed from any deployment environment.

## Agent definition

The system prompt, model defaults, and tool schemas live under
`agents/booking_assistant/`:

- `guidelines/instructions.md` — the assistant's system prompt
- `guidelines/description.md` — short context appended to the system prompt
- `tools/entity-tool.md` — human-readable entity allow-list (informational).
  The **authoritative** source of truth for tools at runtime is `config.json`
  (schemas) plus the implementations in `server/agent-tools.js` (behaviour).
  Keep this file in sync with `config.json` when adding/removing tools.
- `config.json` — `model`, `max_tool_rounds`, and the `tools` array passed to
  the OpenAI Chat Completions `tools` parameter

Prompt, model, and tool-schema changes do **not** require code changes — the
server reads these files at boot (and caches them in-process). The tool
*implementations* (what `check_availability`, `draft_booking`, and
`submit_booking_request` actually do) live in `server/agent-tools.js`.

## Extending to Realtime / voice

The current proxy ships text-only. The same conversation model and tool
implementations can be reused for a Realtime endpoint by adding a new route
(e.g. `POST /api/agents/conversations/:id/realtime-session`) that mints an
ephemeral Realtime session using the same `OPENAI_API_KEY`.
