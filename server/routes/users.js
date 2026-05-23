import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { hashPassword, stripUser } from '../auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(['admin', 'user']).default('user'),
  password: z.string().min(8),
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  full_name: z.string().min(1).optional(),
  role: z.enum(['admin', 'user']).optional(),
  password: z.string().min(8).optional(),
});

router.get('/', requireRole('admin'), async (_req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_date DESC'
    );
    res.json(rows.map(stripUser));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      throw new HttpError(404, 'Not Found');
    }
    const { rows } = await query(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!rows[0]) throw new HttpError(404, 'Not Found');
    res.json(stripUser(rows[0]));
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const hash = await hashPassword(data.password);
    const { rows } = await query(
      `INSERT INTO users (email, full_name, role, password_hash, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.email, data.full_name, data.role, hash, req.user.email]
    );
    res.status(201).json(stripUser(rows[0]));
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const updates = [];
    const values = [];
    let idx = 1;
    if (data.email) { updates.push(`email = $${idx++}`); values.push(data.email); }
    if (data.full_name) { updates.push(`full_name = $${idx++}`); values.push(data.full_name); }
    if (data.role) { updates.push(`role = $${idx++}`); values.push(data.role); }
    if (data.password) {
      const hash = await hashPassword(data.password);
      updates.push(`password_hash = $${idx++}`); values.push(hash);
    }
    if (!updates.length) {
      const { rows } = await query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
      if (!rows[0]) throw new HttpError(404, 'Not Found');
      return res.json(stripUser(rows[0]));
    }
    updates.push('updated_date = NOW()');
    values.push(req.params.id);
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );
    if (!rows[0]) throw new HttpError(404, 'Not Found');
    res.json(stripUser(rows[0]));
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!rowCount) throw new HttpError(404, 'Not Found');
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
