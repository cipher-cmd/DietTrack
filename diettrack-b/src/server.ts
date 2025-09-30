// src/server.ts
try {
  require('module-alias/register');
} catch {
}

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

console.log(
  `[BOOT] DietTrack starting… cwd=${process.cwd()} NODE_ENV=${
    process.env.NODE_ENV ?? '(unset)'
  } PORT=${process.env.PORT ?? '4000'}`
);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

import analysisRoutes from '@/routes/analysis';
import userRoutes from '@/routes/user';
import feedbackRoutes from '@/routes/feedback';
import photoUploadRoutes from '@/routes/photoUpload';
import debugRoutes from '@/routes/debug';
import ingredientsRoutes from '@/routes/ingredients';

import { errorHandler } from '@/middleware/errorHandler';
import logger from '@/utils/logger';
import { rateLimiter } from '@/middleware/rateLimiter';
import { getSupabase } from '@/database/supabase';

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});

const missing: string[] = [];
if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
  missing.push('SUPABASE_SERVICE_ROLE_KEY');

const STRATEGY = (process.env.AI_STRATEGY || 'gemini_only').toLowerCase();
if (STRATEGY !== 'vision_only' && !process.env.GEMINI_API_KEY) {
  missing.push('GEMINI_API_KEY');
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_TEST =
  NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID !== 'undefined';

if (missing.length && !IS_TEST) {
  console.error(
    `[BOOT] Missing required environment variables: ${missing.join(', ')}`
  );
  process.exit(1);
}

const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT || 4000);

server.on('error', (err: any) => {
  console.error('[BOOT] HTTP server error:', err?.code || err?.message || err);
  if (err && err.code === 'EADDRINUSE') {
    console.error(
      `[BOOT] Port ${PORT} already in use. Use "netstat -ano | findstr :${PORT}" then "taskkill /F /PID <pid>" on Windows.`
    );
  }
  process.exit(1);
});
server.on('listening', () => {
  const addr = server.address();
  console.log(
    `[BOOT] Listening on ${
      typeof addr === 'string' ? addr : `http://0.0.0.0:${PORT}`
    }`
  );
});

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  const id =
    (req as any).id || (req.headers['x-request-id'] as string) || uuidv4();
  (req as any).id = id;
  res.setHeader('X-Request-Id', id);
  next();
});

app.use(compression());

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
      'X-User-Id',
    ],
  })
);

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

if (NODE_ENV === 'production') app.use(rateLimiter);

app.get('/ping', (_req, res) => res.send('pong'));

app.get('/health', (_req, res) => {
  return res.json({
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

app.get('/ready', async (_req, res) => {
  const tableToPing = process.env.READINESS_TABLE || 'ifct_foods';
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from(tableToPing).select('id').limit(1);
    if (error) throw error;
    return res.json({ status: 'READY' });
  } catch (e) {
    console.error('[READY] degraded:', e);
    return res.status(503).json({ status: 'DEGRADED' });
  }
});

app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/photo-upload', photoUploadRoutes);
app.use('/api/v1/ingredients', ingredientsRoutes);

if (NODE_ENV !== 'production' || process.env.DEBUG_ROUTES === 'true') {
  app.use('/api/v1/debug', debugRoutes);
}

app.get('/api/v1', (_req, res) => {
  return res.json({
    message: 'DietTrack API v1.0',
    endpoints: {
      analysis: '/api/v1/analysis',
      'analysis-analyze (POST)': '/api/v1/analysis/analyze',
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

// 404 LAST (Express 5: do NOT use "*")
app.use((req, res) => {
  logger.warn('404', { method: req.method, url: req.originalUrl });
  return res
    .status(404)
    .json({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
});

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err && (err as any).type === 'entity.parse.failed') {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid JSON body', code: 'BAD_JSON' });
    }
    return next(err);
  }
);

app.use(errorHandler);

function shutdown(sig: string) {
  logger.info(`${sig} received, shutting down...`);
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Only start the listener outside of tests
import os from 'os';
import type { NetworkInterfaceInfo } from 'os';

if (!IS_TEST) {
  try {
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 DietTrack Backend running on port ${PORT}`);
      console.log(`🚀 DietTrack Backend running on port ${PORT}`);
      console.log(`🏥 Health: http://0.0.0.0:${PORT}/health`);
      console.log(`📚 API:    http://0.0.0.0:${PORT}/api/v1`);
      // Show LAN IPs
      const ifaces = os.networkInterfaces();
      Object.keys(ifaces).forEach((ifname) => {
        ifaces[ifname]?.forEach((iface: NetworkInterfaceInfo) => {
          if (iface.family === 'IPv4' && !iface.internal) {
            console.log(
              `🌐 Accessible from LAN: http://${iface.address}:${PORT}/`
            );
          }
        });
      });
    });
  } catch (err) {
    console.error('[BOOT] Failed to start listener:', err);
    process.exit(1);
  }
}

export default app;
