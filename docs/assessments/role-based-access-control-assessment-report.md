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
