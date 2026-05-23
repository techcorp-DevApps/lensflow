import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
};

export const hashPassword = (plain) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

export const signToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    getSecret(),
    { expiresIn: '7d' }
  );

export const verifyToken = (token) => jwt.verify(token, getSecret());

export const stripUser = (row) => {
  if (!row) return row;
  const { password_hash: _ignored, deleted_at: _del, ...rest } = row;
  return rest;
};

export const findUserByEmail = async (email) => {
  const { rows } = await query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL LIMIT 1',
    [email]
  );
  return rows[0] || null;
};

export const findUserById = async (id) => {
  const { rows } = await query(
    'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

export const seedAdminUser = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await findUserByEmail(email);
  if (existing) return;
  const hash = await hashPassword(password);
  await query(
    `INSERT INTO users (email, full_name, role, password_hash, created_by)
     VALUES ($1, $2, 'admin', $3, $1)`,
    [email, process.env.ADMIN_NAME || 'Administrator', hash]
  );
  console.log(`[auth] seeded admin user ${email}`);
};
