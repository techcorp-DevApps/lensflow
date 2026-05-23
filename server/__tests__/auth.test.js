import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { initTestDb } from './test-db.js';
import { createApp } from '../app.js';
import { query } from '../db.js';
import { hashPassword, signToken } from '../auth.js';

describe('auth routes', () => {
  let teardown;
  let app;
  let user;

  beforeAll(async () => {
    teardown = await initTestDb();
    app = createApp();
    const hash = await hashPassword('correct-horse-battery');
    const { rows } = await query(
      `INSERT INTO users (email, full_name, role, password_hash, created_by)
       VALUES ($1, 'Admin', 'admin', $2, $1) RETURNING *`,
      ['admin@example.com', hash]
    );
    user = rows[0];
  });

  afterAll(async () => { await teardown(); });

  test('GET /health responds 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('POST /api/auth/login returns token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'correct-horse-battery' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('admin@example.com');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test('POST /api/auth/login rejects bad password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/login rejects bad email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'whatever' });
    expect(res.status).toBe(400);
  });

  test('GET /api/auth/me requires token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns user when authed', async () => {
    const token = signToken(user);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@example.com');
  });

  test('POST /api/auth/logout returns ok', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
