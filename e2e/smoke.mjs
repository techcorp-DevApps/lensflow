#!/usr/bin/env node
// HTTP-level smoke test for the 3 e2e journeys (login, booking request,
// client gallery). Runs against the in-memory test-server without a browser,
// so it works in stock Linux sandboxes that lack the system libraries
// (libglib, libnss, libnspr, etc.) required by Playwright's Chromium.
//
// Used by:
//   - `npm run test:e2e:smoke` (local + Replit validation gate `e2e`)
//   - GitHub Actions runs the full Playwright suite via `test:e2e` against a
//     real Chromium install on ubuntu-latest.

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}`;

const log = (...a) => console.log('[smoke]', ...a);
const fail = (msg) => { console.error('[smoke] FAIL:', msg); process.exit(1); };

const waitForServer = async (timeoutMs = 20000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/__test__/seed`);
      if (r.ok) return await r.json();
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error(`server did not become ready in ${timeoutMs}ms`);
};

const expect = (cond, msg) => { if (!cond) fail(msg); };

const run = async () => {
  log('starting test-server on port', PORT);
  const proc = spawn(process.execPath, ['server/test-server.js'], {
    env: { ...process.env, PORT: String(PORT), JWT_SECRET: 'smoke-secret' },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  const shutdown = () => { try { proc.kill('SIGTERM'); } catch { /* */ } };
  process.on('exit', shutdown);
  process.on('SIGINT', () => { shutdown(); process.exit(130); });

  try {
    const seed = await waitForServer();
    expect(seed.galleryId, 'seed endpoint should return galleryId');
    log('server ready, seeded gallery:', seed.galleryId);

    // ---- Journey 1: login flow ----
    log('journey 1: login');
    const badLogin = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'e2e@example.com', password: 'wrong' }),
    });
    expect(badLogin.status === 401, `wrong password should 401, got ${badLogin.status}`);

    const okLogin = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'e2e@example.com', password: 'e2e-password' }),
    });
    expect(okLogin.ok, `valid login should succeed, got ${okLogin.status}`);
    const loginBody = await okLogin.json();
    expect(loginBody.token, 'login response should include token');
    expect(loginBody.user?.email === 'e2e@example.com', 'login user email mismatch');

    const me = await fetch(`${BASE}/api/auth/me`, {
      headers: { authorization: `Bearer ${loginBody.token}` },
    });
    expect(me.ok, `/auth/me with token should succeed, got ${me.status}`);
    const meBody = await me.json();
    expect(meBody.role === 'admin', 'seeded user should be admin');
    log('  login + /me OK');

    // SPA shell renders on /login (Express SPA catchall)
    const loginPage = await fetch(`${BASE}/login`);
    expect(loginPage.ok && (await loginPage.text()).includes('<div id="root">'),
      'GET /login should serve SPA shell');
    log('  SPA shell served');

    // ---- Journey 2: anonymous booking request ----
    log('journey 2: booking request');
    const bookingReq = await fetch(`${BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Smoke Test Client',
        client_email: 'smoke@example.com',
        client_phone: '+15555550100',
        session_type: 'portrait',
        session_date: new Date(Date.now() + 7 * 86400_000).toISOString(),
        location: 'Test Park',
        notes: 'created by e2e smoke',
        access_token: 'smoke-' + Math.random().toString(36).slice(2),
      }),
    });
    expect(bookingReq.status === 201, `booking POST should return 201, got ${bookingReq.status}`);
    const booking = await bookingReq.json();
    expect(booking.id, 'booking response should include id');
    expect(booking.status === 'pending', 'new booking should default to pending');
    log('  booking created:', booking.id);

    // Anonymous list with restricting filter (access_token) should return it.
    const bookingList = await fetch(
      `${BASE}/api/bookings?q=${encodeURIComponent(JSON.stringify({ access_token: booking.access_token }))}`
    );
    expect(bookingList.ok, `filtered booking list should succeed, got ${bookingList.status}`);
    const listBody = await bookingList.json();
    expect(Array.isArray(listBody) && listBody.length === 1, 'filtered list should return our booking');
    log('  booking lookup by access_token OK');

    // ---- Journey 3: client gallery password gate ----
    log('journey 3: client gallery');
    const galleryGet = await fetch(`${BASE}/api/galleries/${seed.galleryId}`);
    expect(galleryGet.ok, `gallery GET should succeed, got ${galleryGet.status}`);
    const gallery = await galleryGet.json();
    expect(gallery.status === 'published', 'seeded gallery should be published');
    expect(gallery.password === 'gallery-pass', 'seeded gallery password mismatch');

    // Gallery image list (anonymous) requires a gallery_id filter restriction.
    const images = await fetch(
      `${BASE}/api/gallery-images?q=${encodeURIComponent(JSON.stringify({ gallery_id: seed.galleryId }))}`
    );
    expect(images.ok, `gallery-images list should succeed, got ${images.status}`);
    const imageList = await images.json();
    expect(Array.isArray(imageList) && imageList.length === 2,
      `seeded gallery should have 2 images, got ${imageList.length}`);
    log('  gallery + 2 images visible via API');

    // Unfiltered gallery-images list (no restriction) should 401.
    const dump = await fetch(`${BASE}/api/gallery-images`);
    expect(dump.status === 401, `unfiltered list should 401, got ${dump.status}`);
    log('  unfiltered dump correctly rejected');

    log('ALL SMOKE CHECKS PASSED');
  } catch (err) {
    fail(err?.stack || err?.message || String(err));
  } finally {
    shutdown();
  }
};

run();
