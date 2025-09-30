// src/routes/ingredients.ts
// Lightweight, robust router with async wrapper + per-route timeout.

import { Router } from 'express';
import {
  ingredientsLookup,
  pingIngredients,
} from '@/controllers/ingredientsController';

const router = Router();

// Small async wrapper so thrown/rejected errors hit the global error handler
const wrap =
  <T extends (...args: any[]) => any>(fn: T) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Simple per-route timeout (returns 504 if we exceed)
const ROUTE_TIMEOUT_MS = Number(process.env.ROUTE_TIMEOUT_MS || 30000);
function withTimeout(ms: number) {
  return (_req: any, res: any, next: any) => {
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

// Health/ping endpoint for ingredient subsystem
router.get('/ping', withTimeout(ROUTE_TIMEOUT_MS), wrap(pingIngredients));

// Ingredient name lookup
// Example: GET /api/v1/ingredients/lookup?name=ghee&limit=5
router.get('/lookup', withTimeout(ROUTE_TIMEOUT_MS), wrap(ingredientsLookup));

export default router;
