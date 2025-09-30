// src/routes/analysisAdjust.ts

import { Router } from 'express';

const router = Router();

/**
 * Save user-edited portions (and optional add-ons).
 * Body may include:
 *  - adjustedItems: [{ itemId, portionSize: { estimatedGrams }, ... }]
 *  - ingredientAddOns: [{ name, calories, protein, carbs, fat }]
 *
 * Note: We lazy-load the controller to avoid compile-time issues if the
 * symbol isn't exported at build time. The main analysis router already
 * exposes this endpoint; this file is a safe shim.
 */
router.post('/:id/adjusted', (req, res, next) => {
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
    return fn(req, res);
  })().catch(next);
});

export default router;
