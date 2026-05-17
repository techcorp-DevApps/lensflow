# OpenAI agent integration (Booking Assistant)

Configure these environment variables for the frontend runtime:

- `VITE_OPENAI_PROJECT_NAME` (example: `lensflow`)
- `VITE_OPENAI_PROJECT_ID` (example: `proj_xxx`)
- `VITE_OPENAI_API_KEY` *(optional; use only with a secure backend relay in dev)*

The booking chat passes these values in conversation metadata so the backend agent orchestration can select the OpenAI project context.

> Security note: do not expose production API keys directly in browser bundles. Prefer server-side secret management.
