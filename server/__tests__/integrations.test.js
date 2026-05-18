import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { initTestDb } from './test-db.js';
import { createApp } from '../app.js';
import { query } from '../db.js';
import { hashPassword, signToken } from '../auth.js';

describe('integrations routes', () => {
  let teardown;
  let app;
  let token;

  beforeAll(async () => {
    teardown = await initTestDb();
    app = createApp();
    delete process.env.SMTP_HOST;
    const hash = await hashPassword('test-pass');
    const { rows } = await query(
      `INSERT INTO users (email, full_name, role, password_hash, created_by)
       VALUES ($1, 'Admin', 'admin', $2, $1) RETURNING *`,
      ['admin@example.com', hash]
    );
    token = signToken(rows[0]);
  });

  afterAll(async () => { await teardown(); });

  test('requires auth', async () => {
    const res = await request(app)
      .post('/api/integrations/email/send')
      .send({ to: 'a@example.com', subject: 'hi', body: 'hi' });
    expect(res.status).toBe(401);
  });

  test('email/send returns smtp_not_configured when SMTP_HOST missing', async () => {
    const res = await request(app)
      .post('/api/integrations/email/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'a@example.com', subject: 'hi', body: 'hi' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.delivered).toBe(false);
    expect(res.body.reason).toBe('smtp_not_configured');
  });

  test('email/send rejects invalid payload', async () => {
    const res = await request(app)
      .post('/api/integrations/email/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ to: 'not-an-email', subject: '' });
    expect(res.status).toBe(400);
  });

  test('files/upload writes local file and returns url', async () => {
    const res = await request(app)
      .post('/api/integrations/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello world'), 'hello.txt');
    expect(res.status).toBe(201);
    expect(res.body.file_url).toMatch(/\/uploads\//);
    expect(res.body.provider).toBe('local');
  });

  test('files/upload rejects when file is missing', async () => {
    const res = await request(app)
      .post('/api/integrations/files/upload')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
