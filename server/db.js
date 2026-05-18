import pg from 'pg';

const { Pool } = pg;

let pool = null;

export const getPool = () => {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const ssl = /sslmode=require/i.test(connectionString) || process.env.PGSSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined;
  pool = new Pool({ connectionString, ssl });
  pool.on('error', (err) => console.error('pg pool error', err));
  return pool;
};

export const hasDatabase = () => Boolean(process.env.DATABASE_URL);

export const query = (text, params) => getPool().query(text, params);

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
