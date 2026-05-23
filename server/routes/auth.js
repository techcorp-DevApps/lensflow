import { Router } from 'express';
import { z } from 'zod';
import {
  findUserByEmail,
  signToken,
  stripUser,
  verifyPassword,
} from '../auth.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (!user) throw new HttpError(401, 'Invalid email or password');
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) throw new HttpError(401, 'Invalid email or password');
    const token = signToken(user);
    res.json({ token, user: stripUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

router.get('/redirect-to-login', (req, res) => {
  const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/';
  res.redirect(302, `/login?from=${encodeURIComponent(returnTo)}`);
});

export default router;
