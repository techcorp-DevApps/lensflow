import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { initTestDb } from './test-db.js';
import { createApp } from '../app.js';
import { query } from '../db.js';
import { hashPassword, signToken } from '../auth.js';

describe('RBAC — admin entity routes', () => {
  let teardown;
  let app;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    teardown = await initTestDb();
    app = createApp();

    const hash = await hashPassword('Password123!');

    const { rows: adminRows } = await query(
      `INSERT INTO users (email, full_name, role, password_hash, created_by)
       VALUES ($1, 'Admin User', 'admin', $2, $1) RETURNING *`,
      ['admin@rbac.test', hash]
    );
    adminToken = signToken(adminRows[0]);

    const { rows: userRows } = await query(
      `INSERT INTO users (email, full_name, role, password_hash, created_by)
       VALUES ($1, 'Regular User', 'user', $2, $1) RETURNING *`,
      ['user@rbac.test', hash]
    );
    userToken = signToken(userRows[0]);
  });

  afterAll(async () => { await teardown(); });

  // ---- Helper ----
  const get = (path, token) => {
    const req = request(app).get(path);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };
  const post = (path, body, token) => {
    const req = request(app).post(path).send(body);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };
  const put = (path, body, token) => {
    const req = request(app).put(path).send(body);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };
  const del = (path, token) => {
    const req = request(app).delete(path);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };

  // ---- Bookings admin ops ----
  describe('GET /api/bookings (admin list)', () => {
    test('no token → 401', async () => {
      const res = await get('/api/bookings');
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await get('/api/bookings', userToken);
      expect(res.status).toBe(403);
    });
    test('admin token → 200', async () => {
      const res = await get('/api/bookings', adminToken);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/bookings (public — booking request)', () => {
    test('no token → 201 (public create allowed)', async () => {
      const res = await post('/api/bookings', {
        client_name: 'Jane Public',
        client_email: 'jane@example.com',
        session_type: 'portrait',
        session_date: '2025-12-01',
      });
      expect(res.status).toBe(201);
    });
  });

  // ---- Contracts admin ops ----
  describe('POST /api/contracts (admin create)', () => {
    test('no token → 401', async () => {
      const res = await post('/api/contracts', {});
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await post('/api/contracts', {}, userToken);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/contracts/:id (admin delete)', () => {
    test('no token → 401', async () => {
      const res = await del('/api/contracts/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await del('/api/contracts/00000000-0000-0000-0000-000000000000', userToken);
      expect(res.status).toBe(403);
    });
  });

  // ---- Galleries admin ops ----
  describe('POST /api/galleries (admin create)', () => {
    test('no token → 401', async () => {
      const res = await post('/api/galleries', {});
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await post('/api/galleries', {}, userToken);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/galleries/:id (admin delete)', () => {
    test('no token → 401', async () => {
      const res = await del('/api/galleries/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await del('/api/galleries/00000000-0000-0000-0000-000000000000', userToken);
      expect(res.status).toBe(403);
    });
  });

  // ---- Gallery images admin ops ----
  describe('POST /api/gallery-images (admin create)', () => {
    test('no token → 401', async () => {
      const res = await post('/api/gallery-images', {});
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await post('/api/gallery-images', {}, userToken);
      expect(res.status).toBe(403);
    });
  });

  // ---- Checklist templates (admin-only, no public ops) ----
  describe('GET /api/checklist-templates', () => {
    test('no token → 401', async () => {
      const res = await get('/api/checklist-templates');
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await get('/api/checklist-templates', userToken);
      expect(res.status).toBe(403);
    });
    test('admin token → 200', async () => {
      const res = await get('/api/checklist-templates', adminToken);
      expect(res.status).toBe(200);
    });
  });

  // ---- Shoot checklists (admin-only, no public ops) ----
  describe('GET /api/shoot-checklists', () => {
    test('no token → 401', async () => {
      const res = await get('/api/shoot-checklists');
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await get('/api/shoot-checklists', userToken);
      expect(res.status).toBe(403);
    });
    test('admin token → 200', async () => {
      const res = await get('/api/shoot-checklists', adminToken);
      expect(res.status).toBe(200);
    });
  });

  // ---- User management (admin-only) ----
  describe('GET /api/users', () => {
    test('no token → 401', async () => {
      const res = await get('/api/users');
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await get('/api/users', userToken);
      expect(res.status).toBe(403);
    });
    test('admin token → 200', async () => {
      const res = await get('/api/users', adminToken);
      expect(res.status).toBe(200);
    });
  });

  // ---- Public exception: anonymous booking lookup by ID ----
  describe('GET /api/bookings/:id (public get)', () => {
    test('non-existent id without token → 404 (public get allowed, row not found)', async () => {
      const res = await get('/api/bookings/00000000-0000-0000-0000-000000000001');
      expect(res.status).toBe(404);
    });
  });

  // ---- Public exception: anonymous contract read ----
  describe('GET /api/contracts/:id (public get)', () => {
    test('non-existent id without token → 404 (public get allowed)', async () => {
      const res = await get('/api/contracts/00000000-0000-0000-0000-000000000001');
      expect(res.status).toBe(404);
    });
  });

  // ---- Public exception: anonymous gallery read ----
  describe('GET /api/galleries/:id (public get)', () => {
    test('non-existent id without token → 404 (public get allowed)', async () => {
      const res = await get('/api/galleries/00000000-0000-0000-0000-000000000001');
      expect(res.status).toBe(404);
    });
  });

  // ---- Bulk ops require admin ----
  describe('POST /api/bookings/bulk (admin bulk create)', () => {
    test('no token → 401', async () => {
      const res = await post('/api/bookings/bulk', []);
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await post('/api/bookings/bulk', [], userToken);
      expect(res.status).toBe(403);
    });
    test('admin token → 201', async () => {
      const res = await post('/api/bookings/bulk', [], adminToken);
      expect(res.status).toBe(201);
    });
  });

  // ---- update-many requires admin ----
  describe('PATCH /api/bookings/update-many (admin)', () => {
    test('no token → 401', async () => {
      const res = await request(app)
        .patch('/api/bookings/update-many')
        .send({ where: {}, data: { status: 'pending' } });
      expect(res.status).toBe(401);
    });
    test('non-admin token → 403', async () => {
      const res = await request(app)
        .patch('/api/bookings/update-many')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ where: {}, data: { status: 'pending' } });
      expect(res.status).toBe(403);
    });
  });
});
