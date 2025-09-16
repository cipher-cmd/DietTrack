// src/server.ts
import 'module-alias/register';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

import analysisRoutes from '@/routes/analysis';
import analysisAdjustRoutes from '@/routes/analysisAdjust';
import userRoutes from '@/routes/user';
import feedbackRoutes from '@/routes/feedback';
import photoUploadRoutes from '@/routes/photoUpload';
import debugRoutes from '@/routes/debug';
import ingredientsRoutes from '@/routes/ingredients';

import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import logger from '@/utils/logger';
import { getSupabase } from '@/database/supabase';

// ── Required envs ─────────────────────────────────────────────────────────────
const missing: string[] = [];
if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
  missing.push('SUPABASE_SERVICE_ROLE_KEY');

const STRATEGY = (process.env.AI_STRATEGY || 'gemini_only').toLowerCase();
if (STRATEGY !== 'vision_only' && !process.env.GEMINI_API_KEY) {
  missing.push('GEMINI_API_KEY');
}
if (missing.length) {
  logger.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// ── App/server ────────────────────────────────────────────────────────────────
const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT || 4000);
const NODE_ENV = process.env.NODE_ENV || 'development';

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Request id for traceability
app.use((req, res, next) => {
  const id =
    (req as any).id || (req.headers['x-request-id'] as string) || uuidv4();
  (req as any).id = id;
  res.setHeader('X-Request-Id', id);
  next();
});

// Compression first
app.use(compression());

// Helmet (loosen CSP in dev to avoid blocking)
app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
    hsts:
      NODE_ENV === 'production'
        ? { maxAge: 15552000, includeSubDomains: true, preload: true }
        : false,
  })
);

// CORS
const devOrigins = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/(10|172|192)\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
  /^exp:\/\/.+$/,
];
const prodOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (NODE_ENV !== 'production') {
        return devOrigins.some((re) => re.test(origin))
          ? cb(null, true)
          : cb(new Error('Not allowed by CORS (dev)'));
      }
      return prodOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-Id',
    ],
  })
);

// Body parsing (fail early on big payloads)
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      if (buf.length > 5 * 1024 * 1024) {
        const ip =
          (req as any).ip || (req as any).socket?.remoteAddress || 'unknown';
        logger.warn('Large body received', {
          bytes: buf.length,
          ip,
          id: (req as any).id,
        });
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting only in prod
if (NODE_ENV === 'production') app.use(rateLimiter);

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'DietTrack Backend API',
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
    strategy: STRATEGY,
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  });
});

// Readiness (light DB touch)
app.get('/ready', async (_req, res) => {
  try {
    const supabase = getSupabase();
    // small, fast check
    await supabase.from('ingredients').select('id').limit(1);
    res.json({ status: 'READY' });
  } catch {
    res.status(503).json({ status: 'DEGRADED' });
  }
});

// Routes
app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/analysis', analysisAdjustRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/photo-upload', photoUploadRoutes);
app.use('/api/v1/ingredients', ingredientsRoutes);

// Debug routes only in dev or explicit flag
if (NODE_ENV !== 'production' || process.env.DEBUG_ROUTES === 'true') {
  app.use('/api/v1/debug', debugRoutes);
}

// API index
app.get('/api/v1', (_req, res) => {
  res.json({
    message: 'DietTrack API v1.0',
    endpoints: {
      analysis: '/api/v1/analysis',
      'analysis-adjusted (POST)': '/api/v1/analysis/:id/adjusted',
      user: '/api/v1/user',
      feedback: '/api/v1/feedback',
      'photo-upload': '/api/v1/photo-upload',
      ingredients: '/api/v1/ingredients',
      ...(NODE_ENV !== 'production' || process.env.DEBUG_ROUTES === 'true'
        ? { debug: '/api/v1/debug' }
        : {}),
    },
  });
});

// 404 LAST, then error handler
app.use('*', (req, res) => {
  logger.warn('404', { method: req.method, url: req.originalUrl });
  res
    .status(404)
    .json({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
});

// Error handler must be after all routes (including 404)
app.use(errorHandler);

// Shutdown
function shutdown(sig: string) {
  logger.info(`${sig} received, shutting down...`);
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Tweak keep-alive to avoid lingering sockets under load
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.listen(PORT, () => {
  logger.info(`🚀 DietTrack Backend running on port ${PORT}`);
  logger.info(`🏥 Health: http://localhost:${PORT}/health`);
  logger.info(`📚 API:    http://localhost:${PORT}/api/v1`);
});

export default app;
