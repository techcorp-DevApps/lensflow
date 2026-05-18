import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { attachUser } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import integrationsRouter from './routes/integrations.js';
import agentsRouter from './routes/agents.js';
import {
  bookingsRouter,
  contractsRouter,
  galleriesRouter,
  galleryImagesRouter,
  checklistTemplatesRouter,
  shootChecklistsRouter,
} from './routes/entities.js';
import { hasDatabase } from './db.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  const origins = (process.env.APP_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && origins.length === 0) {
    console.warn('[server] WARNING: APP_ORIGIN is not set; all CORS origins will be blocked in production');
  }
  app.use(cors({
    origin: isProduction
      ? (origins.length ? origins : false)
      : (origins.length ? origins : true),
    credentials: true,
  }));

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.use(attachUser);

  app.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'illuminate-studios-api',
      database: hasDatabase(),
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/contracts', contractsRouter);
  app.use('/api/galleries', galleriesRouter);
  app.use('/api/gallery-images', galleryImagesRouter);
  app.use('/api/checklist-templates', checklistTemplatesRouter);
  app.use('/api/shoot-checklists', shootChecklistsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/agents', agentsRouter);

  // Legacy /entities/* aliases — used by src/api/contracts.js and src/api/galleries.js
  // which still hit these paths with appBaseUrl="" (same origin)
  app.use('/entities/Contract', contractsRouter);
  app.use('/entities/Gallery', galleriesRouter);

  // Local uploads (dev only by default)
  const uploadsDir = process.env.LOCAL_UPLOAD_DIR || path.resolve('uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
  }

  // SPA static + fallback for production
  const distDir = path.resolve('dist');
  const serveSpa = process.env.SERVE_SPA === 'true'
    || (process.env.NODE_ENV === 'production' && fs.existsSync(distDir));
  if (serveSpa && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^\/(?!api\/|health$|uploads\/).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
};
