// Standalone test server: spins up Express against an in-memory Postgres
// (via pg-mem) and seeds a known admin + gallery for Playwright e2e specs.
import { createApp } from './app.js';
import { initTestDb } from './__tests__/test-db.js';
import { query } from './db.js';
import { hashPassword } from './auth.js';

const PORT = Number(process.env.PORT) || 4173;

const seed = async () => {
  const hash = await hashPassword('e2e-password');
  const u = await query(
    `INSERT INTO users (email, full_name, role, password_hash, created_by)
     VALUES ($1, 'E2E Admin', 'admin', $2, $1) RETURNING *`,
    ['e2e@example.com', hash]
  );
  const owner = u.rows[0].email;

  const g = await query(
    `INSERT INTO galleries (title, password, status, created_by)
     VALUES ($1, $2, 'published', $3) RETURNING *`,
    ['E2E Gallery', 'gallery-pass', owner]
  );
  await query(
    `INSERT INTO gallery_images (gallery_id, image_url, filename, "order", created_by)
     VALUES ($1, $2, 'one.jpg', 1, $3),
            ($1, $4, 'two.jpg', 2, $3)`,
    [g.rows[0].id, 'https://placehold.co/600x400?text=1', owner, 'https://placehold.co/600x400?text=2']
  );
  console.log(`[test-server] seeded gallery ${g.rows[0].id}`);
  return { galleryId: g.rows[0].id };
};

const start = async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-secret';
  process.env.NODE_ENV = 'test';
  process.env.SERVE_SPA = 'true';
  await initTestDb();
  const seeded = await seed();
  const app = createApp();
  // Expose seeded IDs so Playwright specs can look them up without auth.
  // Registered after createApp; the SPA catch-all skips `/__test__/`.
  app.get('/__test__/seed', (_req, res) => res.json(seeded));
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[test-server] listening on http://0.0.0.0:${PORT}`);
  });
};

start().catch((err) => {
  console.error('[test-server] failed to start', err);
  process.exit(1);
});
