// src/routes/feedback.ts
import { Router } from 'express';
import {
  submitFeedback,
  getFeedbackByAnalysisId,
} from '@/controllers/feedbackController';

const router = Router();

const wrap =
  <T extends (...args: any[]) => any>(fn: T) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

if (typeof submitFeedback !== 'function') {
  throw new Error('feedbackController export "submitFeedback" is missing');
}

router.get('/health', (_req, res) => res.json({ ok: true }));

router.post('/', wrap(submitFeedback));

if (typeof getFeedbackByAnalysisId === 'function') {
  router.get('/:analysisId', wrap(getFeedbackByAnalysisId as any));
}

export default router;
