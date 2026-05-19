---
title: "Role-Based Access Control Assessment Report"
project_area: "Photography Management Application"
assessment_type: "RBAC / Admin Workspace Access Review"
source_material: "Attached Agent screenshots"
status: "Assessment and remediation plan"
---

# Role-Based Access Control Assessment Report

## 1. Executive Summary

The current role-based access control implementation contains partial role infrastructure, but the admin workspace is not consistently protected as an admin-only surface.

The database already supports user roles, the JWT carries role data, and server-side role middleware exists. However, the primary admin workspace routes are currently gated only by authentication rather than explicit admin authorization. As a result, any signed-in non-admin user could access the photographer/admin cockpit if they can authenticate and navigate to those routes.

The required fix is to clearly separate:

- **Admin cockpit:** photographer/admin-only operational interface.
- **Public customer surface:** public landing, booking entry points, token-based customer portals, contract signing, and client gallery access.

This assessment does **not** assume or introduce full customer accounts. Customer account login and customer dashboards should be treated as a separate feature if required later.

## 2. Current RBAC State

The existing implementation already includes several RBAC building blocks:

| Area | Current State |
|---|---|
| Database | `users.role` column exists. Default role is `user`; `admin` is available as an option. |
| Authentication token | JWT encodes the user's role. |
| Server authorization middleware | `requireRole('admin')` exists. |
| Existing protected backend routes | `requireRole('admin')` already protects `/api/users` and checks agent conversations. |
| Frontend role usage | Role is currently used only in one observed frontend location: an admin debug view inside `PageNotFound.jsx`. |
| Admin workspace gating | Admin pages are currently protected by `RequireAuth`, not `RequireAdmin`. |

## 3. Core Finding

### Finding: Admin Workspace Is Authentication-Only, Not Admin-Only

The admin workspace currently includes areas such as:

- Dashboard
- Bookings
- Contracts
- Galleries
- Checklists
- Reminders

These pages are gated by `RequireAuth`. This confirms the user is signed in, but it does **not** confirm the user is an admin.

### Impact

A non-admin authenticated user can potentially access the photographer's operational cockpit, including admin dashboards and business-management pages, regardless of their actual role.

### Root Cause

There is no consistent separation between:

- customer-facing public or token-based routes; and
- authenticated admin-only interface routes.

There is also no explicit role check preventing a non-admin user from seeing the admin dashboard and related admin pages.

## 4. Backend API Finding

### Finding: Most Admin Entity API Routes Are Auth-Only

Most admin entity API routes appear to require authentication, but not the `admin` role.

Example risk pattern:

```http
GET /api/bookings
```

A non-admin authentication token may be sufficient to access admin entity list or CRUD endpoints.

### Affected Route Groups

The remediation plan should review and protect all admin CRUD/list operations for at least the following route groups:

- Bookings
- Contracts
- Galleries
- Gallery images
- Checklist templates
- Shoot checklists
- Reminders, if exposed through admin-only CRUD/list APIs

### Required Backend Control

Admin entity CRUD/list operations should require:

```js
requireRole('admin')
```

This must be applied without breaking existing public exceptions.

## 5. Public Access Exceptions to Preserve

The fix must not remove legitimate customer/public workflows.

The following public or token-based exceptions should remain accessible according to their existing rules:

- Public booking requests
- Contract signing flows
- Client gallery access by token
- Token-based customer portals
- Public marketing landing page
- Booking chat, where currently public or token-driven

These flows should remain outside the admin UI and should not require admin authentication.

## 6. Scope Decision

This task should **not** introduce customer accounts or customer sign-in.

The intended split is:

| Surface | Access Model |
|---|---|
| Admin cockpit | Admin login; admin role required; protected by `RequireAdmin` and `requireRole('admin')`. |
| Public customer surface | Public or token-based access; no customer login required. |

Full customer accounts, customer dashboards, and customer-side login flows should be planned as a separate feature if required later.

## 7. Recommended Frontend Remediation

### 7.1 Create `RequireAdmin`

Create a `RequireAdmin` component that extends the existing `RequireAuth` behavior and adds an explicit user-role check.

Expected behavior:

- If the user is not authenticated, redirect to `/admin/login`.
- If the user is authenticated but not an admin, redirect to a no-access page.
- If the user is authenticated and has role `admin`, allow access.

Conceptual behavior:

```jsx
<RequireAdmin>
  <AdminLayout />
</RequireAdmin>
```

### 7.2 Move Admin Pages Under `/admin/*`

Admin pages should be routed under an explicit admin namespace.

Recommended route structure:

| Current / General Route | Recommended Route |
|---|---|
| `/login` | `/admin/login` |
| `/dashboard` | `/admin/dashboard` |
| `/bookings` | `/admin/bookings` |
| `/contracts` | `/admin/contracts` |
| `/galleries` | `/admin/galleries` |
| `/checklists` | `/admin/checklists` |
| `/reminders` | `/admin/reminders` |

The legacy `/login` route should redirect to `/admin/login`.

### 7.3 Convert Root `/` Into a Public Landing Page

The root route should not be the admin dashboard.

Recommended root behavior:

- Display a public landing page.
- Include a booking call-to-action.
- Include a photographer/admin sign-in link pointing to `/admin/login`.
- Keep customers away from admin-specific navigation and layouts.

### 7.4 Add No-Access Handling

Create or reuse a no-access page for authenticated non-admin users.

The page should avoid exposing admin route details, internal application structure, or sensitive operational metadata.

## 8. Recommended Backend Remediation

Apply `requireRole('admin')` to every admin-only entity route while preserving public exceptions.

Recommended control pattern:

```js
router.get('/bookings', requireAuth, requireRole('admin'), listBookings);
router.post('/bookings', requireAuth, requireRole('admin'), createBooking);
router.put('/bookings/:id', requireAuth, requireRole('admin'), updateBooking);
router.delete('/bookings/:id', requireAuth, requireRole('admin'), deleteBooking);
```

Public/token-based endpoints should remain separate and should not share ambiguous route handlers with admin-only endpoints unless the authorization branch is explicit and tested.

## 9. Testing Requirements

Add test coverage for both frontend route gating and backend API authorization.

### 9.1 Backend Authorization Tests

For each admin entity route group, test:

- unauthenticated request is rejected;
- authenticated non-admin request is rejected;
- authenticated admin request is allowed;
- public/token exception still works where applicable.

Minimum expected outcomes:

| Scenario | Expected Result |
|---|---|
| No token requests admin endpoint | `401 Unauthorized` |
| Non-admin token requests admin endpoint | `403 Forbidden` |
| Admin token requests admin endpoint | Success response |
| Valid token/magic-link public customer flow | Existing success behavior preserved |

### 9.2 Frontend Route Tests

Test the following route behavior:

- `/admin/dashboard` redirects unauthenticated users to `/admin/login`.
- `/admin/dashboard` redirects authenticated non-admin users to no-access.
- `/admin/dashboard` renders for authenticated admins.
- `/` renders the public landing page.
- `/login` redirects to `/admin/login`.
- Customer token flows do not render admin navigation or admin layouts.

## 10. Documentation Updates

Update project documentation to state:

- admin pages live under `/admin/*`;
- admin pages require `role === 'admin'`;
- customer-facing flows remain public or token-based;
- full customer accounts are out of scope for this task;
- backend admin CRUD/list endpoints require `requireRole('admin')`;
- public exceptions must be documented per route.

## 11. Task Dependency

This task should depend on **Task #4**, because Task #4 is currently in progress and is expected to touch many of the same files.

The dependency is required to reduce merge conflicts across routing, auth, and admin UI files.

## 12. Acceptance Criteria

The remediation should be considered complete only when all of the following are true:

- Admin UI routes are grouped under `/admin/*`.
- `/admin/*` routes are protected by `RequireAdmin`, not only `RequireAuth`.
- Non-admin authenticated users cannot view admin dashboards or admin layouts.
- Admin entity API list/CRUD routes require `requireRole('admin')`.
- Existing public booking, contract-signing, and gallery-token flows continue working.
- `/` renders a public landing page, not the admin dashboard.
- `/login` redirects to `/admin/login`.
- Tests cover unauthenticated, non-admin, and admin access paths.
- Documentation reflects the new route and access-control model.
- The implementation is sequenced after Task #4 or otherwise rebased to avoid conflicts.

## 13. Risk Rating

| Risk Area | Rating | Reason |
|---|---:|---|
| Admin UI exposure | High | Any signed-in non-admin may access admin workspace pages. |
| Admin API exposure | High | Authenticated non-admin tokens may access admin entity CRUD/list endpoints. |
| Customer workflow regression | Medium | Public/token flows must be preserved while admin routes are locked down. |
| Merge conflict risk | Medium | Task #4 is already in progress and touches overlapping files. |

## 14. Recommended Priority

This should be treated as a high-priority access-control fix.

The system already contains the necessary primitives: `users.role`, JWT role encoding, and `requireRole('admin')`. The remaining work is to apply those controls consistently across admin frontend routes and admin backend APIs while preserving existing public exceptions.

---

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

