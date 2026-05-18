import 'dotenv/config';
import { createApp } from './app.js';
import { runMigrations } from './migrations/runner.js';
import { seedAdminUser } from './auth.js';
import { hasDatabase, closePool } from './db.js';

const start = async () => {
  const app = createApp();

  if (hasDatabase()) {
    try {
      await runMigrations();
      await seedAdminUser();
    } catch (err) {
      console.error('[server] migration/seed failed', err);
      process.exit(1);
    }
  } else {
    console.warn('[server] DATABASE_URL is not set; API routes that need the DB will fail');
  }

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  const server = app.listen(port, host, () => {
    console.log(`[server] listening on http://${host}:${port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] received ${signal}, shutting down`);
    server.close(async () => {
      await closePool().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
