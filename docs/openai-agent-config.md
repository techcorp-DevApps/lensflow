# OpenAI agent integration (Booking Assistant)

## Server (required)

The OpenAI key lives **only** on the server. Set it on the API process:

- `OPENAI_API_KEY` — production OpenAI secret. Consumed by the server-side
  agent proxy (see Task #3) and never exposed to the browser.

## Frontend (optional, non-secret)

The booking chat may forward non-secret OpenAI project metadata to the server
inside the conversation `metadata.integration` payload so the proxy can pick
the right project context:

- `VITE_OPENAI_PROJECT_NAME` — e.g. `lensflow`
- `VITE_OPENAI_PROJECT_ID` — e.g. `proj_xxx`

Both are optional. Never put `OPENAI_API_KEY` (or any secret) behind a `VITE_`
prefix — anything `VITE_*` is bundled into the public JS shipped to browsers.
