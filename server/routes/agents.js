import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();
router.use(requireAuth);

const createConversationSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}).passthrough();

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']).default('user'),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

router.post('/conversations', async (req, res, next) => {
  try {
    const data = createConversationSchema.parse(req.body || {});
    const { rows } = await query(
      `INSERT INTO agent_conversations (title, metadata, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.title || null, JSON.stringify(data.metadata || {}), req.user.email]
    );
    res.status(201).json({ ...rows[0], messages: [] });
  } catch (err) { next(err); }
});

router.get('/conversations', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM agent_conversations WHERE deleted_at IS NULL AND created_by = $1 ORDER BY created_date DESC`,
      [req.user.email]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

const loadOwnedConversation = async (id, user) => {
  const { rows } = await query(
    `SELECT * FROM agent_conversations WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const conv = rows[0];
  if (!conv) throw new HttpError(404, 'Not Found');
  if (user.role !== 'admin' && conv.created_by !== user.email) {
    throw new HttpError(404, 'Not Found');
  }
  return conv;
};

router.get('/conversations/:id', async (req, res, next) => {
  try {
    const conv = await loadOwnedConversation(req.params.id, req.user);
    const { rows: messages } = await query(
      `SELECT * FROM agent_messages WHERE conversation_id = $1 ORDER BY created_date ASC`,
      [req.params.id]
    );
    res.json({ ...conv, messages });
  } catch (err) { next(err); }
});

router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const data = messageSchema.parse(req.body);
    await loadOwnedConversation(req.params.id, req.user);
    const { rows } = await query(
      `INSERT INTO agent_messages (conversation_id, role, content, metadata)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, data.role, data.content, JSON.stringify(data.metadata || {})]
    );
    // The OpenAI proxy task will implement assistant responses.
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
