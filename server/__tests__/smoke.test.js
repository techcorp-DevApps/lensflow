import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { runMigrations } from '../migrations/runner.js';
import { query, hasDatabase, closePool } from '../db.js';
import { hashPassword, signToken } from '../auth.js';

const shouldSkip = !hasDatabase() || !process.env.JWT_SECRET;

test('smoke: health + auth + booking round trip', { skip: shouldSkip }, async (t) => {
  await runMigrations();
  const app = createApp();
  const email = `smoke+${Date.now()}@example.com`;
  const hash = await hashPassword('smoke-password');
  const { rows } = await query(
    `INSERT INTO users (email, full_name, role, password_hash, created_by)
     VALUES ($1, 'Smoke Test', 'admin', $2, $1) RETURNING *`,
    [email, hash]
  );
  const user = rows[0];
  const token = signToken(user);

  t.after(async () => {
    await query('DELETE FROM bookings WHERE created_by = $1', [email]);
    await query('DELETE FROM users WHERE id = $1', [user.id]);
    await closePool();
  });

  const health = await request(app).get('/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);

  const unauth = await request(app).get('/api/auth/me');
  assert.equal(unauth.status, 401);

  const me = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.email, email);

  const created = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      client_name: 'Smoke Client',
      client_email: 'client@example.com',
      session_type: 'portrait',
      session_date: '2026-06-01T10:00:00.000Z',
    });
  assert.equal(created.status, 201);
  assert.equal(created.body.client_name, 'Smoke Client');

  const fetched = await request(app)
    .get(`/api/bookings/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.id, created.body.id);

  const updated = await request(app)
    .put(`/api/bookings/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'confirmed' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.status, 'confirmed');

  const deleted = await request(app)
    .delete(`/api/bookings/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(deleted.status, 204);

  // Public routes: booking request, contract sign flow, gallery access
  const publicBooking = await request(app)
    .post('/api/bookings')
    .send({
      client_name: 'Public Client',
      client_email: 'public@example.com',
      session_type: 'portrait',
      session_date: '2026-07-01T10:00:00.000Z',
      access_token: 'pub-token-smoke',
    });
  assert.equal(publicBooking.status, 201, 'anonymous booking request should succeed');

  const byToken = await request(app)
    .get('/api/bookings')
    .query({ q: JSON.stringify({ access_token: 'pub-token-smoke' }) });
  assert.equal(byToken.status, 200);
  assert.equal(byToken.body.length, 1);

  const unfiltered = await request(app).get('/api/bookings');
  assert.equal(unfiltered.status, 401, 'unauthenticated list without filter should be 401');

  // Contract: public get + public sign (restricted fields only)
  const contract = await request(app)
    .post('/api/contracts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      booking_id: publicBooking.body.id,
      type: 'service_contract',
      client_name: 'Public Client',
      client_email: 'public@example.com',
      content: 'Terms here',
      status: 'sent',
    });
  assert.equal(contract.status, 201);

  const publicGetContract = await request(app)
    .get(`/api/contracts/${contract.body.id}`);
  assert.equal(publicGetContract.status, 200);

  const publicSignContract = await request(app)
    .put(`/api/contracts/${contract.body.id}`)
    .send({ signature: 'Public Client', signed_date: new Date().toISOString(), status: 'signed' });
  assert.equal(publicSignContract.status, 200);
  assert.equal(publicSignContract.body.status, 'signed');

  // Clean up public data
  t.after(async () => {
    await query('DELETE FROM contracts WHERE id = $1', [contract.body.id]);
    await query('DELETE FROM bookings WHERE access_token = $1', ['pub-token-smoke']);
  });

  // Authorization: a second non-admin user cannot read another user's record
  // nor list users.
  const otherEmail = `smoke-other+${Date.now()}@example.com`;
  const otherHash = await hashPassword('smoke-password');
  const { rows: otherRows } = await query(
    `INSERT INTO users (email, full_name, role, password_hash, created_by)
     VALUES ($1, 'Smoke Other', 'user', $2, $1) RETURNING *`,
    [otherEmail, otherHash]
  );
  const other = otherRows[0];
  const otherToken = signToken(other);
  t.after(async () => {
    await query('DELETE FROM agent_messages WHERE conversation_id IN (SELECT id FROM agent_conversations WHERE created_by = $1)', [otherEmail]);
    await query('DELETE FROM agent_conversations WHERE created_by = $1', [otherEmail]);
    await query('DELETE FROM users WHERE id = $1', [other.id]);
  });

  const listUsersAsUser = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${otherToken}`);
  assert.equal(listUsersAsUser.status, 403);

  const peekOtherUser = await request(app)
    .get(`/api/users/${user.id}`)
    .set('Authorization', `Bearer ${otherToken}`);
  assert.equal(peekOtherUser.status, 404);

  const selfUser = await request(app)
    .get(`/api/users/${other.id}`)
    .set('Authorization', `Bearer ${otherToken}`);
  assert.equal(selfUser.status, 200);

  // Agent conversation IDOR check.
  const adminConv = await request(app)
    .post('/api/agents/conversations')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'admin convo' });
  assert.equal(adminConv.status, 201);
  const convId = adminConv.body.id;

  const peekConv = await request(app)
    .get(`/api/agents/conversations/${convId}`)
    .set('Authorization', `Bearer ${otherToken}`);
  assert.equal(peekConv.status, 404);

  const postConv = await request(app)
    .post(`/api/agents/conversations/${convId}/messages`)
    .set('Authorization', `Bearer ${otherToken}`)
    .send({ role: 'user', content: 'hi' });
  assert.equal(postConv.status, 404);
});
