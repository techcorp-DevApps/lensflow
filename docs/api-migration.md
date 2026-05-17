# Illuminate Studios API Reference — Railway Deployment

**Status:** Base44-disconnected target API reference  
**Target platform:** Railway  
**Recommended runtime:** Node.js + Express or equivalent HTTP API runtime  
**Recommended database:** Railway PostgreSQL  
**Base URL, local:** `http://localhost:3000/api`  
**Base URL, production:** `https://<your-railway-domain>/api`

> This document replaces the Base44 SDK/API surface with a self-hosted Railway API. It intentionally removes `@base44/sdk`, the Base44 app ID, Base44 API key usage, and Base44 App Agent endpoints.

---

## 1. Migration Objective

The current API reference is tied to Base44 through:

- `https://illuminatestudiosau.base44.app/api`
- `@base44/sdk`
- `createClient({ appId, headers: { api_key } })`
- SDK calls such as `base44.entities.Booking.list()`
- Base44 App Agent conversation endpoints

The Railway version must use:

- First-party REST endpoints under `/api`
- Server-side authentication and authorization
- Environment variables for secrets
- A production database, preferably Railway PostgreSQL
- No client-side Base44 API key
- No dependency on Base44 entity or agent services

---

## 2. Required Base44 Removal

Remove the following from the application:

```bash
npm uninstall @base44/sdk
```

Remove all imports:

```javascript
import { createClient } from "@base44/sdk";
```

Remove all Base44 client initialization:

```javascript
const base44 = createClient({
  appId: "...",
  headers: {
    api_key: "..."
  }
});
```

Remove all SDK calls:

```javascript
base44.entities.Booking.list()
base44.entities.Booking.create()
base44.entities.Contract.list()
base44.entities.Gallery.list()
base44.entities.GalleryImage.list()
base44.entities.ChecklistTemplate.list()
base44.entities.ShootChecklist.list()
base44.entities.User.list()
base44.agents.getConversations()
```

Replace them with calls to the Railway API using `fetch`, `axios`, or a local API client.

---

## 3. Security Action Required

The previous documentation exposed a Base44 API key. Treat that key as compromised.

Required actions:

1. Revoke or rotate the Base44 API key.
2. Remove the key from source control, docs, screenshots, and logs.
3. Remove any Base44 app ID/API key references from the frontend.
4. Use Railway environment variables for all secrets.
5. Ensure the browser never receives database credentials or privileged API keys.

---

## 4. Railway Runtime Contract

The Railway app must bind to the `PORT` environment variable supplied by Railway.

```javascript
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
```

Recommended production start command:

```bash
npm start
```

Recommended local development command:

```bash
npm run dev
```

---

## 5. Environment Variables

Set these in Railway project variables:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<generate-a-long-random-secret>
APP_ORIGIN=https://<your-frontend-domain>
PUBLIC_API_BASE_URL=https://<your-railway-domain>/api
```

Optional:

```env
EMAIL_FROM=hello@illuminatestudios.com.au
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
STORAGE_PROVIDER=
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
```

Do not define `PORT` manually unless Railway specifically requires it for your service configuration. The application should read `process.env.PORT`.

---

## 6. Recommended API Setup

### Install

```bash
npm install express cors helmet morgan zod jsonwebtoken bcrypt pg
npm install -D nodemon
```

### `package.json`

```json
{
  "name": "illuminate-studios-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "lint": "eslint .",
    "test": "node --test"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Minimal Server Entry

```javascript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.APP_ORIGIN?.split(",") || true,
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "illuminate-studios-api"
  });
});

app.use("/api/bookings", bookingsRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/galleries", galleriesRouter);
app.use("/api/gallery-images", galleryImagesRouter);
app.use("/api/checklist-templates", checklistTemplatesRouter);
app.use("/api/shoot-checklists", shootChecklistsRouter);
app.use("/api/users", usersRouter);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Illuminate Studios API listening on port ${port}`);
});
```

---

# API Reference

## Authentication

All non-public endpoints should require authentication unless explicitly marked public.

Recommended header:

```http
Authorization: Bearer <jwt>
```

Recommended auth endpoints:

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Authenticate admin/user |
| `POST` | `/api/auth/logout` | Clear current session/token |
| `GET` | `/api/auth/me` | Return authenticated user profile |

---

## Common Query Parameters

List endpoints should support:

| Parameter | Type | Description |
| --- | --- | --- |
| `q` | string | Search query or JSON filter |
| `limit` | number | Maximum records to return |
| `skip` | number | Number of records to skip |
| `sort_by` | string | Sort field. Prefix with `-` for descending order |

Example:

```http
GET /api/bookings?limit=25&skip=0&sort_by=-created_date
```

---

# Booking

## Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `client_name` | string | Yes | Full name of the client |
| `client_email` | string | Yes | Client email address |
| `client_phone` | string | No | Client phone number |
| `session_type` | enum | Yes | `portrait`, `wedding`, `family`, `newborn`, `maternity`, `event`, `commercial`, `headshot` |
| `session_date` | string `<date-time>` | Yes | Date and time of the session |
| `location` | string | No | Shoot location |
| `notes` | string | No | Additional notes from client |
| `status` | enum | No | `pending`, `confirmed`, `contract_sent`, `contract_signed`, `completed`, `cancelled` |
| `price` | number | No | Session price |
| `deposit_paid` | boolean | No | Whether deposit has been paid |
| `reminder_sent` | boolean | No | Whether pre-shoot reminder was sent |
| `gallery_id` | string | No | Associated gallery ID |
| `access_token` | string | No | Unique token for client portal access |
| `id` | string | No | Unique record identifier |
| `created_date` | string `<date-time>` | No | Record creation timestamp |
| `updated_date` | string `<date-time>` | No | Record last update timestamp |
| `created_by` | string | No | Email of the user who created the record |

## Endpoints

### `GET /api/bookings`

List Booking records.

```javascript
const response = await fetch(`${API_BASE_URL}/bookings`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const records = await response.json();
```

### `POST /api/bookings`

Create a Booking record.

```javascript
const response = await fetch(`${API_BASE_URL}/bookings`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    client_name: "Jane Client",
    client_email: "jane@example.com",
    session_type: "portrait",
    session_date: "2026-06-01T10:00:00.000Z"
  })
});

const record = await response.json();
```

### `DELETE /api/bookings`

Delete multiple Booking records by query.

```javascript
await fetch(`${API_BASE_URL}/bookings`, {
  method: "DELETE",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    client_name: "Example client_name"
  })
});
```

### `POST /api/bookings/bulk`

Bulk create Booking records.

```javascript
const response = await fetch(`${API_BASE_URL}/bookings/bulk`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify([
    { client_name: "Client One", client_email: "one@example.com", session_type: "family", session_date: "2026-06-01T10:00:00.000Z" },
    { client_name: "Client Two", client_email: "two@example.com", session_type: "headshot", session_date: "2026-06-02T10:00:00.000Z" }
  ])
});

const records = await response.json();
```

### `PUT /api/bookings/bulk`

Bulk update Booking records.

```javascript
await fetch(`${API_BASE_URL}/bookings/bulk`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify([
    { id: "booking_id_1", status: "confirmed" },
    { id: "booking_id_2", status: "cancelled" }
  ])
});
```

### `PATCH /api/bookings/update-many`

Update many Booking records by query.

```javascript
await fetch(`${API_BASE_URL}/bookings/update-many`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    where: { status: "pending" },
    data: { reminder_sent: true }
  })
});
```

### `GET /api/bookings/{booking_id}`

Get a Booking record by ID.

```javascript
const response = await fetch(`${API_BASE_URL}/bookings/${recordId}`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const record = await response.json();
```

### `PUT /api/bookings/{booking_id}`

Update a Booking record.

```javascript
const response = await fetch(`${API_BASE_URL}/bookings/${recordId}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    status: "confirmed"
  })
});

const record = await response.json();
```

### `DELETE /api/bookings/{booking_id}`

Delete a Booking record.

```javascript
await fetch(`${API_BASE_URL}/bookings/${recordId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### `PUT /api/bookings/{booking_id}/restore`

Restore a deleted Booking record.

```javascript
const response = await fetch(`${API_BASE_URL}/bookings/${recordId}/restore`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const record = await response.json();
```

---

# Contract

## Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `booking_id` | string | Yes | Associated booking ID |
| `type` | enum | Yes | `service_contract`, `model_release`, `liability_waiver`, `print_release` |
| `client_name` | string | Yes | Client name |
| `client_email` | string | Yes | Client email |
| `content` | string | No | Contract text content |
| `status` | enum | No | `draft`, `sent`, `viewed`, `signed` |
| `signature` | string | No | Client signature typed name |
| `signed_date` | string `<date-time>` | No | Date contract was signed |
| `ip_address` | string | No | IP address at time of signing |
| `id` | string | No | Unique record identifier |
| `created_date` | string `<date-time>` | No | Record creation timestamp |
| `updated_date` | string `<date-time>` | No | Record last update timestamp |
| `created_by` | string | No | Email of the user who created the record |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/contracts` | List Contract records |
| `POST` | `/api/contracts` | Create a Contract record |
| `DELETE` | `/api/contracts` | Delete multiple Contract records |
| `POST` | `/api/contracts/bulk` | Bulk create Contract records |
| `PUT` | `/api/contracts/bulk` | Bulk update Contract records |
| `PATCH` | `/api/contracts/update-many` | Update many Contract records by query |
| `GET` | `/api/contracts/{contract_id}` | Get a Contract record by ID |
| `PUT` | `/api/contracts/{contract_id}` | Update a Contract record |
| `DELETE` | `/api/contracts/{contract_id}` | Delete a Contract record |
| `PUT` | `/api/contracts/{contract_id}/restore` | Restore a deleted Contract record |

Example create request:

```javascript
const response = await fetch(`${API_BASE_URL}/contracts`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    booking_id: "booking_id",
    type: "service_contract",
    client_name: "Jane Client",
    client_email: "jane@example.com",
    content: "Contract terms...",
    status: "draft"
  })
});

const record = await response.json();
```

---

# Gallery

## Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | string | Yes | Gallery title |
| `booking_id` | string | No | Associated booking ID |
| `client_name` | string | No | Client name |
| `client_email` | string | No | Client email |
| `password` | string | Yes | Password to access the gallery |
| `cover_image_url` | string | No | Cover image URL |
| `status` | enum | No | `preparing`, `published`, `archived` |
| `selections_enabled` | boolean | No | Whether clients can select favourites |
| `download_enabled` | boolean | No | Whether clients can download images |
| `expiry_date` | string `<date>` | No | Gallery expiry date |
| `id` | string | No | Unique record identifier |
| `created_date` | string `<date-time>` | No | Record creation timestamp |
| `updated_date` | string `<date-time>` | No | Record last update timestamp |
| `created_by` | string | No | Email of the user who created the record |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/galleries` | List Gallery records |
| `POST` | `/api/galleries` | Create a Gallery record |
| `DELETE` | `/api/galleries` | Delete multiple Gallery records |
| `POST` | `/api/galleries/bulk` | Bulk create Gallery records |
| `PUT` | `/api/galleries/bulk` | Bulk update Gallery records |
| `PATCH` | `/api/galleries/update-many` | Update many Gallery records by query |
| `GET` | `/api/galleries/{gallery_id}` | Get a Gallery record by ID |
| `PUT` | `/api/galleries/{gallery_id}` | Update a Gallery record |
| `DELETE` | `/api/galleries/{gallery_id}` | Delete a Gallery record |
| `PUT` | `/api/galleries/{gallery_id}/restore` | Restore a deleted Gallery record |

Example list request:

```javascript
const response = await fetch(`${API_BASE_URL}/galleries`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const records = await response.json();
```

---

# Gallery Image

## Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `gallery_id` | string | Yes | Associated gallery ID |
| `image_url` | string | Yes | Image file URL |
| `thumbnail_url` | string | No | Thumbnail URL |
| `filename` | string | No | Original filename |
| `selected` | boolean | No | Whether client selected this image |
| `order` | number | No | Display order |
| `id` | string | No | Unique record identifier |
| `created_date` | string `<date-time>` | No | Record creation timestamp |
| `updated_date` | string `<date-time>` | No | Record last update timestamp |
| `created_by` | string | No | Email of the user who created the record |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/gallery-images` | List GalleryImage records |
| `POST` | `/api/gallery-images` | Create a GalleryImage record |
| `DELETE` | `/api/gallery-images` | Delete multiple GalleryImage records |
| `POST` | `/api/gallery-images/bulk` | Bulk create GalleryImage records |
| `PUT` | `/api/gallery-images/bulk` | Bulk update GalleryImage records |
| `PATCH` | `/api/gallery-images/update-many` | Update many GalleryImage records by query |
| `GET` | `/api/gallery-images/{gallery_image_id}` | Get a GalleryImage record by ID |
| `PUT` | `/api/gallery-images/{gallery_image_id}` | Update a GalleryImage record |
| `DELETE` | `/api/gallery-images/{gallery_image_id}` | Delete a GalleryImage record |
| `PUT` | `/api/gallery-images/{gallery_image_id}/restore` | Restore a deleted GalleryImage record |

---

# Checklist Template

## Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `session_type` | enum | Yes | `portrait`, `wedding`, `family`, `newborn`, `maternity`, `event`, `commercial`, `headshot` |
| `items` | array | Yes | Checklist items |
| `id` | string | No | Unique record identifier |
| `created_date` | string `<date-time>` | No | Record creation timestamp |
| `updated_date` | string `<date-time>` | No | Record last update timestamp |
| `created_by` | string | No | Email of the user who created the record |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/checklist-templates` | List ChecklistTemplate records |
| `POST` | `/api/checklist-templates` | Create a ChecklistTemplate record |
| `DELETE` | `/api/checklist-templates` | Delete multiple ChecklistTemplate records |
| `POST` | `/api/checklist-templates/bulk` | Bulk create ChecklistTemplate records |
| `PUT` | `/api/checklist-templates/bulk` | Bulk update ChecklistTemplate records |
| `PATCH` | `/api/checklist-templates/update-many` | Update many ChecklistTemplate records by query |
| `GET` | `/api/checklist-templates/{checklist_template_id}` | Get a ChecklistTemplate record by ID |
| `PUT` | `/api/checklist-templates/{checklist_template_id}` | Update a ChecklistTemplate record |
| `DELETE` | `/api/checklist-templates/{checklist_template_id}` | Delete a ChecklistTemplate record |
| `PUT` | `/api/checklist-templates/{checklist_template_id}/restore` | Restore a deleted ChecklistTemplate record |

---

# Shoot Checklist

## Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `booking_id` | string | Yes | Associated booking ID |
| `session_type` | string | No | Session type |
| `items` | array | Yes | Checklist items with completion status |
| `id` | string | No | Unique record identifier |
| `created_date` | string `<date-time>` | No | Record creation timestamp |
| `updated_date` | string `<date-time>` | No | Record last update timestamp |
| `created_by` | string | No | Email of the user who created the record |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/shoot-checklists` | List ShootChecklist records |
| `POST` | `/api/shoot-checklists` | Create a ShootChecklist record |
| `DELETE` | `/api/shoot-checklists` | Delete multiple ShootChecklist records |
| `POST` | `/api/shoot-checklists/bulk` | Bulk create ShootChecklist records |
| `PUT` | `/api/shoot-checklists/bulk` | Bulk update ShootChecklist records |
| `PATCH` | `/api/shoot-checklists/update-many` | Update many ShootChecklist records by query |
| `GET` | `/api/shoot-checklists/{shoot_checklist_id}` | Get a ShootChecklist record by ID |
| `PUT` | `/api/shoot-checklists/{shoot_checklist_id}` | Update a ShootChecklist record |
| `DELETE` | `/api/shoot-checklists/{shoot_checklist_id}` | Delete a ShootChecklist record |
| `PUT` | `/api/shoot-checklists/{shoot_checklist_id}/restore` | Restore a deleted ShootChecklist record |

---

# User

## Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | Yes | User email |
| `full_name` | string | Yes | Full name of the user |
| `role` | enum | Yes | `admin`, `user` |
| `password_hash` | string | Server-only | Hashed password; never returned to clients |
| `id` | string | No | Unique record identifier |
| `created_date` | string `<date-time>` | No | Record creation timestamp |
| `updated_date` | string `<date-time>` | No | Record last update timestamp |
| `created_by` | string | No | Email of the user who created the record |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/users` | List User records |
| `POST` | `/api/users` | Create a User record |
| `GET` | `/api/users/{user_id}` | Get a User record by ID |
| `PUT` | `/api/users/{user_id}` | Update a User record |
| `DELETE` | `/api/users/{user_id}` | Delete a User record |

---

# App Agent Replacement

The Base44 App Agent endpoints should not be carried forward as-is.

Remove:

```http
GET /apps/{app_id}/agents/conversations
POST /apps/{app_id}/agents/conversations
GET /apps/{app_id}/agents/conversations/{conversation_id}
POST /apps/{app_id}/agents/conversations/{conversation_id}/messages
```

Replacement options:

## Option A — Remove Agent Feature

Use this option if the production client portal does not require an embedded AI assistant.

No replacement endpoints required.

## Option B — Self-Hosted Assistant Endpoint

Use this option if the app still requires assistant-like functionality.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/assistant/conversations` | Create a local conversation |
| `GET` | `/api/assistant/conversations` | List local conversations |
| `GET` | `/api/assistant/conversations/{conversation_id}` | Get a local conversation |
| `POST` | `/api/assistant/conversations/{conversation_id}/messages` | Add a message and receive a response |

Example:

```javascript
const response = await fetch(`${API_BASE_URL}/assistant/conversations/${conversationId}/messages`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    role: "user",
    content: "Hello, how can you help me?"
  })
});

const message = await response.json();
```

---

# Frontend API Client

Create a local API client and replace all direct Base44 SDK usage.

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("auth_token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Request failed"
    }));

    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  bookings: {
    list: (params = "") => apiRequest(`/bookings${params}`),
    get: (id) => apiRequest(`/bookings/${id}`),
    create: (data) => apiRequest("/bookings", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    update: (id, data) => apiRequest(`/bookings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
    delete: (id) => apiRequest(`/bookings/${id}`, {
      method: "DELETE"
    })
  },

  contracts: {
    list: (params = "") => apiRequest(`/contracts${params}`),
    get: (id) => apiRequest(`/contracts/${id}`),
    create: (data) => apiRequest("/contracts", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    update: (id, data) => apiRequest(`/contracts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
    delete: (id) => apiRequest(`/contracts/${id}`, {
      method: "DELETE"
    })
  },

  galleries: {
    list: (params = "") => apiRequest(`/galleries${params}`),
    get: (id) => apiRequest(`/galleries/${id}`),
    create: (data) => apiRequest("/galleries", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    update: (id, data) => apiRequest(`/galleries/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
    delete: (id) => apiRequest(`/galleries/${id}`, {
      method: "DELETE"
    })
  }
};
```

---

# Database Table Mapping

Recommended PostgreSQL tables:

| Base44 Entity | Railway Table |
| --- | --- |
| `Booking` | `bookings` |
| `Contract` | `contracts` |
| `Gallery` | `galleries` |
| `GalleryImage` | `gallery_images` |
| `ChecklistTemplate` | `checklist_templates` |
| `ShootChecklist` | `shoot_checklists` |
| `User` | `users` |

Recommended common columns:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by TEXT,
deleted_at TIMESTAMPTZ
```

Use soft deletion where restore endpoints are required.

---

# Railway Deployment Checklist

1. Create a new Railway project.
2. Add a PostgreSQL service.
3. Connect the application GitHub repository.
4. Set the service root directory if the API lives in a subdirectory.
5. Add the required environment variables.
6. Ensure the app listens on `process.env.PORT`.
7. Set the build command if required:

```bash
npm install
```

8. Set the start command:

```bash
npm start
```

9. Generate a public Railway domain for the API service.
10. Set the frontend variable:

```env
VITE_API_BASE_URL=https://<your-railway-domain>/api
```

11. Run migrations.
12. Smoke test:

```bash
curl https://<your-railway-domain>/health
curl https://<your-railway-domain>/api/bookings
```

---

# Acceptance Criteria

The migration is complete when:

- `@base44/sdk` is removed from dependencies.
- No frontend file imports `@base44/sdk`.
- No code references `base44.entities`.
- No code references `base44.agents`.
- No Base44 app ID or API key remains in source.
- All entity operations route through `/api/*`.
- The Railway service deploys successfully.
- The API binds to `process.env.PORT`.
- Health check returns `200`.
- PostgreSQL migrations run successfully.
- Booking, Contract, Gallery, GalleryImage, ChecklistTemplate, ShootChecklist, and User CRUD routes work.
- Restore routes work for soft-deleted records.
- Authenticated routes reject unauthenticated requests.
- Public client portal access only exposes intended public data.
