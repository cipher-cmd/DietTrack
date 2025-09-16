// src/routes/analysisAdjust.ts
import { Router } from 'express';
import { saveAdjustedAnalysis } from '@/controllers/analysisController';

const router = Router();

// Small async wrapper so thrown/rejected errors hit errorHandler
const wrap =
  <T extends (...args: any[]) => any>(fn: T) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Save user-edited portions (and optional add-ons).
 * Body may include:
 *  - adjustedItems: [{ itemId, portionSize: { estimatedGrams }, ... }]
 *  - ingredientAddOns: [{ name, calories, protein, carbs, fat }]
 */
router.post('/:id/adjusted', wrap(saveAdjustedAnalysis));

export default router;
