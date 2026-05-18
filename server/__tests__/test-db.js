import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { newDb, DataType } from 'pg-mem';
import { setPool, closePool } from '../db.js';

// Initialize an in-memory Postgres + run the schema. Returns a teardown fn.
export const initTestDb = async () => {
  await closePool();
  const mem = newDb({ autoCreateForeignKeyIndices: true });

  // gen_random_uuid() is provided by pgcrypto in real Postgres.
  mem.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => crypto.randomUUID(),
    impure: true,
  });

  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  setPool(pool);

  const here = path.dirname(fileURLToPath(import.meta.url));
  let sql = await readFile(path.join(here, '..', 'migrations', '001_init.sql'), 'utf8');
  // pg-mem doesn't know about CREATE EXTENSION; strip it out.
  sql = sql.replace(/CREATE\s+EXTENSION[^;]*;/gi, '');
  await pool.query(sql);

  return async () => { await closePool(); };
};
