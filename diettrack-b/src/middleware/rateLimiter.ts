// diettrack-b/src/middleware/rateLimiter.ts
// Simple, dependency-light rate limiting for dev & prod.
// Uses express-rate-limit's in-memory store by default.

import rateLimit from 'express-rate-limit';

// Respect reverse proxies if set (server.ts sets trust proxy = 1)
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

// Global API limiter (all routes)
export const rateLimiter = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100), // 100 req/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests', code: 'RATE_LIMIT' },
});

// Tighter limiter just for analysis endpoint(s)
export const analysisRateLimit = rateLimit({
  windowMs: 60_000, // 1 min
  max: 10, // 10 analyses/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many analyses, try again shortly',
    code: 'RATE_LIMIT_ANALYSIS',
  },
});

// Optional: a slightly different limiter for photo uploads
export const uploadLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many uploads, slow down',
    code: 'RATE_LIMIT_UPLOAD',
  },
});
