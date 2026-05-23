import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getStorage } from '../storage/index.js';
import { HttpError } from '../middleware/error.js';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const emailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  body: z.string().optional(),
  html: z.string().optional(),
  from: z.string().email().optional(),
});

router.post('/email/send', async (req, res, next) => {
  try {
    const payload = emailSchema.parse(req.body);
    const host = process.env.SMTP_HOST;
    if (!host) {
      console.log('[email] SMTP not configured; logging email instead', {
        to: payload.to,
        subject: payload.subject,
      });
      return res.json({ ok: true, delivered: false, reason: 'smtp_not_configured' });
    }
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
    const info = await transporter.sendMail({
      from: payload.from || process.env.EMAIL_FROM,
      to: Array.isArray(payload.to) ? payload.to.join(',') : payload.to,
      subject: payload.subject,
      text: payload.body,
      html: payload.html,
    });
    res.json({ ok: true, delivered: true, messageId: info.messageId });
  } catch (err) { next(err); }
});

router.post('/files/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, 'file field is required');
    const storage = getStorage();
    const result = await storage.upload({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    res.status(201).json({
      file_url: result.url,
      url: result.url,
      filename: result.filename,
      mimetype: result.mimetype,
      size: result.size,
      provider: result.provider,
    });
  } catch (err) { next(err); }
});

export default router;
