// src/routes/feedback.ts
// Feedback routes with async wrapper + per-route timeout + payload validation.

import { Router, type RequestHandler } from 'express';
import {
  submitFeedback,
  getFeedbackByAnalysisId,
} from '@/controllers/feedbackController';
import { validateFeedbackSubmission } from '@/middleware/validation';

const router = Router();

const wrap = <T extends RequestHandler>(fn: T): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const ROUTE_TIMEOUT_MS = Number(process.env.ROUTE_TIMEOUT_MS || 30_000);
function withTimeout(ms: number): RequestHandler {
  return (_req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Request timed out',
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

if (typeof submitFeedback !== 'function') {
  throw new Error('feedbackController export "submitFeedback" is missing');
}

router.get('/health', (_req, res) => res.json({ ok: true }));

// ✅ Validate feedback payloads before controller runs
router.post(
  '/',
  withTimeout(ROUTE_TIMEOUT_MS),
  validateFeedbackSubmission,
  wrap(submitFeedback)
);

// Optional GET for inspection by analysis id
if (typeof getFeedbackByAnalysisId === 'function') {
  router.get(
    '/:analysisId',
    withTimeout(ROUTE_TIMEOUT_MS),
    wrap(getFeedbackByAnalysisId as any)
  );
}

export default router;
