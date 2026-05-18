import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { initTestDb } from './test-db.js';
import { createApp } from '../app.js';
import { query } from '../db.js';
import { hashPassword, signToken } from '../auth.js';

describe('entity routers', () => {
  let teardown;
  let app;
  let adminToken;
  let userToken;
  let admin;
  let user;

  beforeAll(async () => {
    teardown = await initTestDb();
    app = createApp();
    const adminHash = await hashPassword('test-pass');
    const userHash = await hashPassword('test-pass');
    const a = await query(
      `INSERT INTO users (email, full_name, role, password_hash, created_by)
       VALUES ($1, 'Admin', 'admin', $2, $1) RETURNING *`,
      ['admin@example.com', adminHash]
    );
    const u = await query(
      `INSERT INTO users (email, full_name, role, password_hash, created_by)
       VALUES ($1, 'User', 'user', $2, $1) RETURNING *`,
      ['user@example.com', userHash]
    );
    admin = a.rows[0]; user = u.rows[0];
    adminToken = signToken(admin);
    userToken = signToken(user);
  });

  afterAll(async () => { await teardown(); });

  describe('bookings', () => {
    test('anonymous can create a booking (public booking request)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          client_name: 'Anon Client',
          client_email: 'anon@example.com',
          session_type: 'portrait',
          session_date: '2026-06-01T10:00:00.000Z',
          access_token: 'tok-anon',
        });
      expect(res.status).toBe(201);
      expect(res.body.client_name).toBe('Anon Client');
      expect(res.body.status).toBe('pending');
    });

    test('anonymous list without filter is 401', async () => {
      const res = await request(app).get('/api/bookings');
      expect(res.status).toBe(401);
    });

    test('anonymous list filtered by access_token works', async () => {
      const res = await request(app)
        .get('/api/bookings')
        .query({ q: JSON.stringify({ access_token: 'tok-anon' }) });
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    test('authed CRUD round-trip', async () => {
      const create = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          client_name: 'Auth Client',
          client_email: 'auth@example.com',
          session_type: 'wedding',
          session_date: '2026-08-01T10:00:00.000Z',
        });
      expect(create.status).toBe(201);
      const id = create.body.id;

      const get = await request(app).get(`/api/bookings/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(get.status).toBe(200);

      const update = await request(app)
        .put(`/api/bookings/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });
      expect(update.status).toBe(200);
      expect(update.body.status).toBe('confirmed');

      const del = await request(app).delete(`/api/bookings/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(del.status).toBe(204);
    });

    test('validation rejects invalid session_type', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          client_name: 'X', client_email: 'x@example.com',
          session_type: 'nonsense', session_date: '2026-08-01T10:00:00Z',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
    });
  });

  describe('contracts (public sign flow)', () => {
    let contractId;

    test('admin creates contract', async () => {
      const res = await request(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          booking_id: 'some-booking',
          type: 'service_contract',
          client_name: 'Client',
          client_email: 'client@example.com',
          content: 'Terms',
          status: 'sent',
        });
      expect(res.status).toBe(201);
      contractId = res.body.id;
    });

    test('anonymous can GET a contract by id', async () => {
      const res = await request(app).get(`/api/contracts/${contractId}`);
      expect(res.status).toBe(200);
    });

    test('anonymous can sign (PUT) but only signing fields', async () => {
      const res = await request(app)
        .put(`/api/contracts/${contractId}`)
        .send({
          signature: 'Client',
          signed_date: new Date().toISOString(),
          status: 'signed',
          client_name: 'Hacker', // should be ignored (not in publicWritable)
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('signed');
      expect(res.body.signature).toBe('Client');
      expect(res.body.client_name).toBe('Client');
    });
  });

  describe('galleries + gallery images', () => {
    let galleryId;

    test('admin creates a gallery', async () => {
      const res = await request(app)
        .post('/api/galleries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Gallery',
          password: 'open-sesame',
          status: 'published',
        });
      expect(res.status).toBe(201);
      galleryId = res.body.id;
    });

    test('anonymous filtered list returns gallery', async () => {
      const res = await request(app)
        .get('/api/galleries')
        .query({ q: JSON.stringify({ id: galleryId }) });
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    test('anonymous can list gallery images filtered by gallery_id', async () => {
      await request(app)
        .post('/api/gallery-images')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gallery_id: galleryId, image_url: 'http://example.com/x.jpg' });
      const res = await request(app)
        .get('/api/gallery-images')
        .query({ q: JSON.stringify({ gallery_id: galleryId }) });
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('checklist templates (jsonb)', () => {
    test('round-trips items as array', async () => {
      const created = await request(app)
        .post('/api/checklist-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ session_type: 'portrait', items: [{ text: 'Bring lens' }] });
      expect(created.status).toBe(201);
      expect(Array.isArray(created.body.items)).toBe(true);
      expect(created.body.items[0].text).toBe('Bring lens');

      const get = await request(app)
        .get(`/api/checklist-templates/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(get.status).toBe(200);
      expect(Array.isArray(get.body.items)).toBe(true);
    });

    test('requires auth', async () => {
      const res = await request(app).get('/api/checklist-templates');
      expect(res.status).toBe(401);
    });
  });

  describe('shoot_checklists', () => {
    test('requires auth for list', async () => {
      const res = await request(app).get('/api/shoot-checklists');
      expect(res.status).toBe(401);
    });

    test('admin CRUD round-trip with JSONB items', async () => {
      const created = await request(app)
        .post('/api/shoot-checklists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          booking_id: 'b-1',
          session_type: 'wedding',
          items: [
            { text: 'Ceremony wide shot', category: 'ceremony', completed: false },
            { text: 'Rings detail', category: 'details' },
          ],
        });
      expect(created.status).toBe(201);
      expect(Array.isArray(created.body.items)).toBe(true);
      expect(created.body.items).toHaveLength(2);
      const id = created.body.id;

      const get = await request(app)
        .get(`/api/shoot-checklists/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(get.status).toBe(200);
      expect(get.body.items[0].text).toBe('Ceremony wide shot');

      const updated = await request(app)
        .put(`/api/shoot-checklists/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          booking_id: 'b-1',
          items: [{ text: 'Ceremony wide shot', completed: true }],
        });
      expect(updated.status).toBe(200);
      expect(updated.body.items[0].completed).toBe(true);

      const del = await request(app)
        .delete(`/api/shoot-checklists/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(del.status).toBe(204);
    });

    test('validation rejects missing booking_id', async () => {
      const res = await request(app)
        .post('/api/shoot-checklists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ text: 'No booking' }] });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
    });

    test('anonymous list without filter is 401', async () => {
      const res = await request(app)
        .post('/api/shoot-checklists')
        .send({ booking_id: 'b-2', items: [{ text: 'x' }] });
      expect(res.status).toBe(401);
    });
  });

  describe('users', () => {
    test('non-admin cannot list users', async () => {
      const res = await request(app).get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    test('non-admin cannot see another user', async () => {
      const res = await request(app).get(`/api/users/${admin.id}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });

    test('non-admin can see self', async () => {
      const res = await request(app).get(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('user@example.com');
    });

    test('admin can list users', async () => {
      const res = await request(app).get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });
});
