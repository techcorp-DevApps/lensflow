import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const runMigrations = async () => {
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const files = (await fs.readdir(__dirname))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const { rows } = await query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
    if (rows.length) continue;
    const sql = await fs.readFile(path.join(__dirname, file), 'utf8');
    console.log(`[migrations] applying ${file}`);
    await query(sql);
    await query('INSERT INTO schema_migrations(name) VALUES ($1)', [file]);
  }
};
