import { Router } from 'express';

import { query } from '../db.js';
import { HttpError } from '../middleware/error.js';

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const parseMaybeJson = (value) => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
};

const parseQueryParam = (raw) => {
  const parsed = parseMaybeJson(raw);
  return isPlainObject(parsed) ? parsed : {};
};

const buildWhere = (table, columns, filter, startIdx = 1) => {
  const clauses = [`${table}.deleted_at IS NULL`];
  const values = [];
  let idx = startIdx;
  for (const [key, val] of Object.entries(filter || {})) {
    if (!columns.includes(key)) continue;
    if (val === null) {
      clauses.push(`${table}."${key}" IS NULL`);
    } else if (Array.isArray(val)) {
      clauses.push(`${table}."${key}" = ANY($${idx})`);
      values.push(val);
      idx += 1;
    } else {
      clauses.push(`${table}."${key}" = $${idx}`);
      values.push(val);
      idx += 1;
    }
  }
  return { where: clauses.join(' AND '), values, nextIdx: idx };
};

const buildSort = (sortBy, columns) => {
  if (!sortBy || typeof sortBy !== 'string') return 'created_date DESC';
  const desc = sortBy.startsWith('-');
  const col = desc ? sortBy.slice(1) : sortBy;
  if (!columns.includes(col)) return 'created_date DESC';
  return `"${col}" ${desc ? 'DESC' : 'ASC'}`;
};

const projectRow = (row, jsonbColumns = []) => {
  if (!row) return row;
  const out = { ...row };
  delete out.deleted_at;
  for (const c of jsonbColumns) {
    if (typeof out[c] === 'string') {
      try { out[c] = JSON.parse(out[c]); } catch { /* keep as-is */ }
    }
  }
  return out;
};

const pickWritable = (body, writable) => {
  const out = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (writable.includes(k)) out[k] = v;
  }
  return out;
};

const serializeForColumn = (value, jsonbColumns, key) => {
  if (jsonbColumns.includes(key) && value !== null && value !== undefined && typeof value !== 'string') {
    return JSON.stringify(value);
  }
  return value;
};

/**
 * Requires the caller to be an authenticated admin.
 * Returns 401 if unauthenticated, 403 if authenticated but not admin.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

/**
 * Config:
 *   table, schema, columns, writable, jsonbColumns
 *   publicOps: array of op names allowed without auth — 'list', 'get', 'create', 'updateOne'
 *   publicFilterKeys: filter keys required for anonymous list (default: id, access_token, gallery_id, booking_id)
 *   publicWritable: writable fields allowed for anonymous updateOne (defaults to writable)
 */
export const createEntityRouter = (config) => {
  const {
    table,
    schema,
    columns,
    writable,
    jsonbColumns = [],
    publicOps = [],
    publicFilterKeys = ['id', 'access_token', 'gallery_id', 'booking_id'],
    publicWritable,
  } = config;

  const isPublic = (op) => publicOps.includes(op);

  /**
   * Gate middleware:
   * - Anonymous caller (no token): allowed only for public ops (customer token flows).
   * - Authenticated non-admin: always 403 — there are no non-admin internal callers.
   * - Authenticated admin: allowed for all ops.
   */
  const gate = (op) => (req, res, next) => {
    if (!req.user) {
      if (isPublic(op)) return next();
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  };

  const router = Router();

  // ---- List ----
  router.get('/', gate('list'), async (req, res, next) => {
    try {
      const filter = parseQueryParam(req.query.q);
      // Anonymous list: require at least one restricting filter key to prevent data dumps
      if (!req.user && isPublic('list')) {
        const hasRestriction = publicFilterKeys.some((k) => filter[k] !== undefined);
        if (!hasRestriction) return res.status(401).json({ error: 'Unauthorized' });
      }
      const sortBy = typeof req.query.sort_by === 'string' ? req.query.sort_by : null;
      const limit = Math.min(parseInt(String(req.query.limit ?? ''), 10) || 500, 1000);
      const skip = Math.max(parseInt(String(req.query.skip ?? ''), 10) || 0, 0);
      const { where, values, nextIdx } = buildWhere(table, columns, filter);
      const sort = buildSort(sortBy, columns);
      const sql = `SELECT * FROM ${table} WHERE ${where} ORDER BY ${sort} LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`;
      const { rows } = await query(sql, [...values, limit, skip]);
      res.json(rows.map((r) => projectRow(r, jsonbColumns)));
    } catch (err) { next(err); }
  });

  // ---- Bulk create (admin required) ----
  router.post('/bulk', requireAdmin, async (req, res, next) => {
    try {
      const list = Array.isArray(req.body) ? req.body : [];
      const created = [];
      for (const item of list) {
        const data = pickWritable(item, writable);
        const parsed = schema.partial().parse(data);
        parsed.created_by = req.user.email;
        const keys = Object.keys(parsed);
        const placeholders = keys.map((_, i) => `$${i + 1}`);
        const vals = keys.map((k) => serializeForColumn(parsed[k], jsonbColumns, k));
        const cols = keys.map((k) => `"${k}"`).join(', ');
        const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const { rows } = await query(sql, vals);
        created.push(projectRow(rows[0], jsonbColumns));
      }
      res.status(201).json(created);
    } catch (err) { next(err); }
  });

  // ---- Bulk update (admin required) ----
  router.put('/bulk', requireAdmin, async (req, res, next) => {
    try {
      const list = Array.isArray(req.body) ? req.body : [];
      const updated = [];
      for (const item of list) {
        if (!item || !item.id) throw new HttpError(400, 'bulk update items require id');
        const { id, ...rest } = item;
        const data = pickWritable(rest, writable);
        const parsed = schema.partial().parse(data);
        const keys = Object.keys(parsed);
        if (keys.length === 0) continue;
        const setSql = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
        const vals = keys.map((k) => serializeForColumn(parsed[k], jsonbColumns, k));
        const sql = `UPDATE ${table} SET ${setSql}, updated_date = NOW() WHERE id = $${keys.length + 1} AND deleted_at IS NULL RETURNING *`;
        const { rows } = await query(sql, [...vals, id]);
        if (rows[0]) updated.push(projectRow(rows[0], jsonbColumns));
      }
      res.json(updated);
    } catch (err) { next(err); }
  });

  // ---- Update many (admin required) ----
  router.patch('/update-many', requireAdmin, async (req, res, next) => {
    try {
      // Accept both { where, data } (new) and { query, data } (legacy wrapper format)
      const body = req.body || {};
      const filter = body.where || body.query || {};
      const { data = {} } = body;
      const parsed = schema.partial().parse(pickWritable(data, writable));
      const keys = Object.keys(parsed);
      if (keys.length === 0) throw new HttpError(400, 'No fields to update');
      const setSql = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const setVals = keys.map((k) => serializeForColumn(parsed[k], jsonbColumns, k));
      const { where, values } = buildWhere(table, columns, filter, keys.length + 1);
      const sql = `UPDATE ${table} SET ${setSql}, updated_date = NOW() WHERE ${where} RETURNING id`;
      const { rows } = await query(sql, [...setVals, ...values]);
      res.json({ success: true, updated: rows.length });
    } catch (err) { next(err); }
  });

  // ---- Create ----
  router.post('/', gate('create'), async (req, res, next) => {
    try {
      const effectiveWritable = (!req.user && publicWritable) ? publicWritable : writable;
      const data = pickWritable(req.body, effectiveWritable);
      const parsed = schema.parse(data);
      if (req.user) parsed.created_by = req.user.email;
      const keys = Object.keys(parsed);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const vals = keys.map((k) => serializeForColumn(parsed[k], jsonbColumns, k));
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const { rows } = await query(sql, vals);
      res.status(201).json(projectRow(rows[0], jsonbColumns));
    } catch (err) { next(err); }
  });

  // ---- Delete many by filter (admin required) ----
  router.delete('/', requireAdmin, async (req, res, next) => {
    try {
      const filter = req.body || {};
      const { where, values } = buildWhere(table, columns, filter);
      const sql = `UPDATE ${table} SET deleted_at = NOW() WHERE ${where} RETURNING id`;
      const { rows } = await query(sql, values);
      res.json({ success: true, deleted: rows.length });
    } catch (err) { next(err); }
  });

  // ---- Get one ----
  router.get('/:id', gate('get'), async (req, res, next) => {
    try {
      const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
      if (!rows[0]) throw new HttpError(404, 'Not Found');
      res.json(projectRow(rows[0], jsonbColumns));
    } catch (err) { next(err); }
  });

  const updateOne = (isRestrictedPublic) => async (req, res, next) => {
    try {
      const effectiveWritable = (isRestrictedPublic && !req.user && publicWritable)
        ? publicWritable
        : writable;
      const data = pickWritable(req.body, effectiveWritable);
      const parsed = schema.partial().parse(data);
      const keys = Object.keys(parsed);
      if (keys.length === 0) {
        const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
        if (!rows[0]) throw new HttpError(404, 'Not Found');
        return res.json(projectRow(rows[0], jsonbColumns));
      }
      const setSql = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const vals = keys.map((k) => serializeForColumn(parsed[k], jsonbColumns, k));
      const sql = `UPDATE ${table} SET ${setSql}, updated_date = NOW() WHERE id = $${keys.length + 1} AND deleted_at IS NULL RETURNING *`;
      const { rows } = await query(sql, [...vals, req.params.id]);
      if (!rows[0]) throw new HttpError(404, 'Not Found');
      res.json(projectRow(rows[0], jsonbColumns));
    } catch (err) { next(err); }
  };

  // ---- Update one ----
  router.put('/:id', gate('updateOne'), updateOne(true));
  router.patch('/:id', gate('updateOne'), updateOne(true));

  // ---- Delete one (admin required) ----
  router.delete('/:id', requireAdmin, async (req, res, next) => {
    try {
      const { rowCount } = await query(`UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
      if (!rowCount) throw new HttpError(404, 'Not Found');
      res.status(204).end();
    } catch (err) { next(err); }
  });

  // ---- Restore (admin required) ----
  router.put('/:id/restore', requireAdmin, async (req, res, next) => {
    try {
      const { rows } = await query(`UPDATE ${table} SET deleted_at = NULL, updated_date = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
      if (!rows[0]) throw new HttpError(404, 'Not Found');
      res.json(projectRow(rows[0], jsonbColumns));
    } catch (err) { next(err); }
  });

  return router;
};
