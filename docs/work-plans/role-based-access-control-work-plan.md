---
title: "Admin Cockpit vs Customer Surface Split"
project_area: "Photography Management Application"
task_type: "Implementation Plan / RBAC Remediation"
status: "Ready for development"
scope: "Separate admin-only cockpit from public customer surface without adding customer accounts"
---

# Admin Cockpit vs Customer Surface Split

## 1. What & Why

Today the app has a single signed-in experience: any authenticated user, regardless of role, can reach the photographer's admin cockpit:

- Dashboard
- Bookings
- Contracts
- Galleries
- Checklists
- Reminders

Most admin entity API routes are gated only by `requireAuth`, not `requireRole('admin')`.

The customer-facing surface is currently wired alongside the admin routes with no clear separation. This includes:

- public booking request;
- AI booking chat;
- token-based client gallery access;
- token-based contract signing; and
- token-based booking status pages.

For the app to be operationally safe, the admin cockpit must be explicitly admin-only at both layers:

1. **URL/UI layer** — admin pages must live under an admin namespace and must not be exposed through customer/public navigation.
2. **API layer** — admin entity endpoints must require `role === 'admin'`, not merely a valid authenticated session.

This task splits the two workflows cleanly without introducing customer accounts. Customers continue to use the existing token-based public links and AI booking chat.

## 2. Done Looks Like

- [ ] Visiting `/` shows a public customer landing page with:
  - a brief hero;
  - a **Book a session** call-to-action;
  - a small, low-emphasis **Photographer sign in** link.
- [ ] `/` works without authentication.
- [ ] `/` never reveals or links to admin pages.
- [ ] All admin pages live under `/admin/*`, including:
  - `/admin/dashboard`
  - `/admin/bookings`
  - `/admin/contracts`
  - `/admin/galleries`
  - `/admin/checklists`
  - `/admin/reminders`
- [ ] Admin sign-in lives at `/admin/login`.
- [ ] Existing `/login` permanently redirects to `/admin/login` so old links still work.
- [ ] Any unauthenticated visit to `/admin/*` redirects to `/admin/login?from=…`.
- [ ] Any authenticated non-admin visit to `/admin/*` renders a clear no-access page:
  - message: **No access — this area is for the studio only**;
  - includes a sign-out action;
  - includes a link to the customer surface;
  - does **not** redirect into the admin cockpit;
  - does **not** silently 404.
- [ ] Every admin entity API route requires `role === 'admin'`, including:
  - bookings;
  - contracts;
  - galleries;
  - gallery images;
  - checklist templates;
  - shoot checklists CRUD/list/update-many/bulk/soft-delete/restore;
  - user management.
- [ ] Any admin entity API call with a non-admin JWT returns HTTP `403` with a clear error envelope.
- [ ] Existing per-route public exceptions are preserved exactly:
  - anonymous booking request `POST`;
  - anonymous client booking lookup by ID;
  - anonymous client gallery read by ID, with optional access token;
  - anonymous gallery image selection;
  - anonymous contract read;
  - anonymous contract sign-by-ID update, limited to signing fields only;
  - anonymous booking-chat agent conversation.
- [ ] Public-exception route behavior does not change.
- [ ] The sidebar renders only inside `/admin/*`.
- [ ] Customer-facing pages render their own minimal public chrome and no admin navigation.
- [ ] The shared API client persists the JWT under a single admin-scoped key.
- [ ] The shared API client clears the JWT on `401` from any admin route, preserving current behavior.
- [ ] Backend tests prove admin gating:
  - no token returns `401`;
  - non-admin token returns `403`;
  - admin token returns expected `2xx`.
- [ ] Public-exception API routes still return expected `2xx` anonymously.
- [ ] Frontend tests prove UI gating:
  - unauthenticated visit to `/admin/dashboard` redirects to `/admin/login`;
  - non-admin authenticated visit to `/admin/dashboard` renders the no-access page;
  - admin visit renders the dashboard.
- [ ] The following commands pass after the split:

```bash
npm run lint
npm run typecheck
npm test
```

- [ ] The Playwright e2e suite from Task #4 passes after the split.

## 3. Out of Scope

The following items are explicitly out of scope for this task:

- Customer accounts.
- Customer sign-in.
- Customer **my bookings** portal.
- Multi-tenant or multi-studio support.
- New admin features beyond the structural move.
- Admin redesign.
- Full public landing page branding or marketing copy beyond what is required to make the page functional and visually consistent with the existing Tailwind/shadcn look.

Customers continue to use token links and the booking chat. If customer accounts or a customer dashboard are required later, they should be planned as a separate task.

## 4. Implementation Steps

### 4.1 Server Gating

Add `requireRole('admin')` to every admin entity route while preserving the public exception list documented in Task #1:

- anonymous booking-request `POST`;
- anonymous contract read;
- restricted anonymous contract sign update;
- anonymous client gallery read;
- anonymous gallery image selection;
- anonymous client booking lookup;
- anonymous booking chat conversation.

Keep `requireAuth` for the conversation list endpoint.

Return a structured `403` response for authenticated non-admin callers. Do not return `404` for this case. The frontend must be able to distinguish unauthenticated access from authenticated-but-forbidden access.

### 4.2 Frontend Route Restructure

Move all admin pages under `/admin/*`.

Create a new `RequireAdmin` element that composes `RequireAuth` and additionally checks:

```js
user.role === 'admin'
```

Keep legacy admin URLs working via permanent redirects for bookmarked URLs. The new `/admin/*` URLs are canonical.

### 4.3 Public Landing at `/`

Replace the current root behavior with a simple public landing page containing:

- hero section;
- **Book a session** link to `/booking-request`;
- **Talk to our booking assistant** link to `/book`;
- small **Photographer sign in** link to `/admin/login`.

Requirements:

- use existing Tailwind/shadcn primitives;
- add no new dependencies;
- make no admin data calls;
- render without a JWT;
- never trigger `/api/auth/me`.

### 4.4 Admin Login Move

Move the login page from `/login` to `/admin/login` without changing page logic.

Keep `/login` as a redirect for backward compatibility.

Update:

- `AuthContext.navigateToLogin`
- `RequireAuth`
- `RequireAdmin`

All login routing should target `/admin/login`.

Logout should return the user to the public landing page at `/`.

### 4.5 No-Access Page

Add `/admin/no-access`, or an equivalent inline state inside `RequireAdmin`, for authenticated non-admin users who land on `/admin/*`.

The no-access state must provide:

- **Sign out** action;
- **Go to customer site** action;
- clear copy stating that the admin area is for studio users only.

### 4.6 Sidebar & Chrome Separation

Render `AppLayout`, including `Sidebar`, only under `/admin/*`.

Customer-facing public pages must use minimal public chrome and must not show admin navigation.

Remove admin-flavoured links from public pages.

### 4.7 API Client Adjustments

When a request returns `403` from an admin route:

- surface a typed `ForbiddenError`;
- let the UI route the user to the no-access page;
- do not silently fail;
- do not treat `403` as an unauthenticated state.

Keep the existing behavior where `401` clears the stored JWT.

### 4.8 Backend Tests

Extend the supertest spec from Task #1, plus any specs added in Task #4, to cover every admin route:

| Caller State | Expected Result |
|---|---:|
| No token | `401` |
| Non-admin token | `403` |
| Admin token | Expected `2xx` |

Re-verify every public-exception route still returns expected `2xx` anonymously.

### 4.9 Frontend Tests

Add component or integration tests for `RequireAdmin`:

| Scenario | Expected Result |
|---|---|
| Unauthenticated user visits admin route | Redirect to `/admin/login` |
| Authenticated non-admin visits admin route | Render no-access state |
| Authenticated admin visits admin route | Render protected admin children |

Add an e2e spec covering:

1. visit `/`;
2. click **Book a session**;
3. submit a booking request anonymously;
4. sign in as admin and confirm the admin cockpit renders;
5. sign in as non-admin and confirm the no-access page renders.

### 4.10 Documentation

Update:

- `REPLIT.md`
- `docs/deployment/backend-api.md`
- `.env.example`

Document:

- the admin/customer split;
- the `/admin/*` namespace;
- public exception behavior;
- how to create the first admin user;
- continued support for `ADMIN_EMAIL` and `ADMIN_PASSWORD` env-seed bootstrap.

## 5. Critical Constraints

- Public-exception API routes must be preserved exactly.
- Customers using existing token links must keep working unchanged.
- Do not add third-party dependencies.
- Do not add Replit-specific packages.
- Keep the JWT and storage key admin-scoped.
- Do not introduce a parallel customer token system in this task.
- Authenticated-but-non-admin API calls must return `403`.
- Authenticated-but-non-admin API calls must not return `404`.
- Authenticated-but-non-admin API calls must not silently redirect to login.
- Keep the following Vite server settings unchanged:

```js
host: '0.0.0.0',
port: 5000,
allowedHosts: true
```

## 6. Relevant Files

### Backend

- `server/app.js`
- `server/auth.js`
- `server/middleware/auth.js`
- `server/routes/entities.js`
- `server/routes/users.js`
- `server/routes/agents.js`
- `server/__tests__/`

### Frontend Routing, Auth, and API Client

- `src/App.jsx`
- `src/components/RequireAuth.jsx`
- `src/lib/AuthContext.jsx`
- `src/components/api/base44Client.js`

### Frontend Layout

- `src/components/layout/AppLayout.jsx`
- `src/components/layout/Sidebar.jsx`

### Frontend Pages

- `src/pages/Login.jsx`
- `src/pages/Logout.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Bookings.jsx`
- `src/pages/Contracts.jsx`
- `src/pages/Galleries.jsx`
- `src/pages/Checklists.jsx`
- `src/pages/Reminders.jsx`
- `src/pages/BookingRequest.jsx`
- `src/pages/BookingChat.jsx`
- `src/pages/ClientGallery.jsx`
- `src/pages/SignContract.jsx`
- `src/pages/ClientBooking.jsx`

### Documentation and Environment

- `REPLIT.md`
- `docs/deployment/backend-api.md`
- `.env.example`
