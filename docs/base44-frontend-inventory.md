# Frontend Base44 Reliance Inventory

## Direct runtime dependency points

- `src/components/api/base44Client.js`
  - Base44-shaped client wrapper (`base44.auth`, `base44.entities.*`, `base44.integrations.Core.*`, `base44.agents.*`).
  - Calls local REST endpoints (`/auth/*`, `/entities/*`, `/integrations/*`, `/agents/*`) but keeps Base44 naming surface.
- `src/api/base44Client.js`
  - Re-export alias keeping legacy import path/name.

## UI routes/pages using Base44 naming or calls

- Booking flow critical paths:
  - `src/pages/BookingRequest.jsx`: `base44.entities.Booking.create`, `base44.auth.me`, `base44.integrations.Core.SendEmail`.
  - `src/pages/BookingChat.jsx`: `base44.agents.createConversation`, `streamMessage`, `addMessage`.
  - `src/pages/ClientBooking.jsx`: `base44.entities.Booking.filter`, `base44.entities.Contract.filter`.
  - `src/pages/Bookings.jsx`: booking CRUD + reminder email sends.
- Email-related paths:
  - `src/pages/Reminders.jsx`: reminder send via `base44.integrations.Core.SendEmail`.
  - `src/pages/Contracts.jsx`: contract send email.
  - `src/components/galleries/GalleryDetail.jsx`: gallery invite/notification email.
- Additional entity usage:
  - `src/pages/Dashboard.jsx`, `src/pages/Galleries.jsx`, `src/pages/Checklists.jsx`, `src/pages/ClientGallery.jsx`, `src/components/checklists/ShootChecklistView.jsx`, `src/api/contracts.js`, `src/api/galleries.js`, `src/lib/AuthContext.jsx`, `src/lib/PageNotFound.jsx`.

## Branding / naming artifacts

- `index.html`
  - Favicon points to `https://base44.com/logo_v2.svg`.
  - Title is `Base44 APP`.
- `src/lib/app-params.js`
  - Local storage keys prefixed with `base44_`.
- Tests and module names still reference `base44` (`src/api/__tests__/base44Client.test.js`, page/auth tests importing `base44`).

## Recommended replacements (behavior-preserving)

1. Introduce neutral SDK alias while preserving compatibility:
   - Add `src/api/client.js` exporting `client` with identical method signatures.
   - Keep `base44` as deprecated alias to avoid breaking existing imports during rollout.
2. Booking flow stabilization first (no behavior changes):
   - Replace `base44.entities.Booking.*` usage in booking pages with domain helpers (`bookingsApi.*`) that call same endpoints.
   - Replace `base44.agents.*` usage with `bookingAssistantApi.*` wrappers that keep current conversation/message semantics.
3. Email path hardening:
   - Replace `base44.integrations.Core.SendEmail` calls with `notificationsApi.sendEmail(payload)` wrapper targeting same `/api/integrations/email/send` backend.
   - Preserve current request payload shape (`to`, `subject`, `body`, optional `from`) so reminders/contracts/gallery emails remain unchanged.
4. Naming/branding cleanup:
   - Update `index.html` title/favicon to Lensflow assets.
   - Migrate localStorage keys from `base44_*` to `lensflow_*` with backward-compat read fallback.
5. Incremental migration plan:
   - Phase 1: wrappers + aliasing only (zero runtime behavior change).
   - Phase 2: swap imports route-by-route (BookingRequest, BookingChat, Bookings, Reminders first).
   - Phase 3: rename tests/modules and remove `base44` alias after full cutover.
