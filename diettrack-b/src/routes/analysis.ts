// src/routes/analysis.ts
import { Router, type RequestHandler } from 'express';
import {
  analyzeFood,
  getAnalysisHistory,
  getAnalysisById,
  // saveAdjustedAnalysis,
} from '@/controllers/analysisController';
import { validateAnalysisRequest } from '@/middleware/validation';
import { analysisRateLimit } from '@/middleware/rateLimiter';

const router = Router();

// Async wrapper so thrown/rejected errors hit errorHandler
const wrap = <T extends RequestHandler>(fn: T): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Per-route timeout
const ROUTE_TIMEOUT_MS = Number(process.env.ROUTE_TIMEOUT_MS || 30000);
function withTimeout(ms: number): RequestHandler {
  return (_req, res, next) => {
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

router.post(
  '/analyze',
  analysisRateLimit,
  withTimeout(ROUTE_TIMEOUT_MS),
  validateAnalysisRequest,
  wrap(analyzeFood)
);

// Compatibility: POST /api/v1/analysis
router.post(
  '/',
  analysisRateLimit,
  withTimeout(ROUTE_TIMEOUT_MS),
  validateAnalysisRequest,
  wrap(analyzeFood)
);

// Adjusted save — lazy import to avoid TS error if the symbol isn't exported at build time
router.post(
  '/:id/adjusted',
  withTimeout(ROUTE_TIMEOUT_MS),
  (req, res, next) => {
    (async () => {
      const mod = await import('@/controllers/analysisController');
      const fn = (mod as any).saveAdjustedAnalysis;
      if (typeof fn !== 'function') {
        return res.status(501).json({
          success: false,
          error: 'Adjusted endpoint not available',
          code: 'NOT_IMPLEMENTED',
        });
      }
      // Call the real controller
      return fn(req, res);
    })().catch(next);
  }
);

router.get('/history', wrap(getAnalysisHistory));
router.get('/:id', wrap(getAnalysisById));

export default router;
