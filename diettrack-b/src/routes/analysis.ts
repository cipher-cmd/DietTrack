// src/routes/analysis.ts
// Adds per-route timeout + robust wrappers + rate-limit.

import { Router } from 'express';
import {
  analyzeFood,
  getAnalysisHistory,
  getAnalysisById,
} from '@/controllers/analysisController';
import { validateAnalysisRequest } from '@/middleware/validation';
import { analysisRateLimit } from '@/middleware/rateLimiter';

const router = Router();

// Small async wrapper so thrown/rejected errors hit errorHandler
const wrap =
  <T extends (...args: any[]) => any>(fn: T) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Simple per-route timeout (returns 504 if we exceed)
const ROUTE_TIMEOUT_MS = Number(process.env.ROUTE_TIMEOUT_MS || 30000);
function withTimeout(ms: number) {
  return (req: any, res: any, next: any) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Analysis timed out',
          code: 'TIMEOUT',
        });
      }
    }, ms);

    const clear = () => clearTimeout(timer);
    res.on('finish', clear);
    res.on('close', clear);
    next();
  };
}

/**
 * @route POST /api/v1/analysis/analyze
 * Validates and runs food analysis (image or text).
 */
router.post(
  '/analyze',
  analysisRateLimit, // ← rate-limit the expensive route
  withTimeout(ROUTE_TIMEOUT_MS),
  validateAnalysisRequest,
  wrap(analyzeFood)
);

/**
 * (Compatibility) Also accept POST /api/v1/analysis
 * so older clients that call `${BASE}/analysis` still work.
 */
router.post(
  '/',
  analysisRateLimit,
  withTimeout(ROUTE_TIMEOUT_MS),
  validateAnalysisRequest,
  wrap(analyzeFood)
);

/**
 * @route GET /api/v1/analysis/history
 * Returns user analysis history (paginated).
 */
router.get('/history', wrap(getAnalysisHistory));

/**
 * @route GET /api/v1/analysis/:id
 * Retrieves specific analysis by ID.
 */
router.get('/:id', wrap(getAnalysisById));

export default router;
