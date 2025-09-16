// diettrack-b/src/routes/user.ts
// User routes with safe async wrapper + full CRUD + preferences.

import { Router, Request, Response, NextFunction } from 'express';
import {
  createUser,
  getUserProfile,
  updateUserProfile,
  getUserStats,
  deleteUser,
  saveUserPreferences,
} from '@/controllers/userController';

const router = Router();

// tiny async wrapper so thrown/rejected errors hit errorHandler
const wrap =
  <T extends (req: Request, res: Response, next?: NextFunction) => any>(
    fn: T
  ) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// sanity check at boot (helps avoid “Route.post() requires a callback …”)
const required = {
  createUser,
  getUserProfile,
  updateUserProfile,
  getUserStats,
  deleteUser,
  saveUserPreferences,
};
for (const [name, fn] of Object.entries(required)) {
  if (typeof fn !== 'function') {
    throw new Error(`userController export missing or not a function: ${name}`);
  }
}

/**
 * Create a user
 * POST /api/v1/user
 * body: { phone, name?, location?, dietary_preferences?: string[], allergies?: string[] }
 */
router.post('/', wrap(createUser));

/**
 * Get a user profile (preferred)
 * GET /api/v1/user/:userId
 */
router.get('/:userId', wrap(getUserProfile));

/**
 * Back-compat: profile without param (expects x-user-id header or ?userId=)
 * GET /api/v1/user/profile
 */
router.get('/profile', wrap(getUserProfile));

/**
 * Update user profile (allow-list in controller)
 * PUT /api/v1/user/:userId
 */
router.put('/:userId', wrap(updateUserProfile));

/**
 * Get basic user stats
 * GET /api/v1/user/:userId/stats
 */
router.get('/:userId/stats', wrap(getUserStats));

/**
 * Save preferences (diet, allergens, etc.)
 * POST /api/v1/user/preferences
 * body: { userId?, preferences: { dietary_preferences?: string[], allergies?: string[] } }
 * (userId can also come from header x-user-id or query)
 */
router.post('/preferences', wrap(saveUserPreferences));

/**
 * Delete user
 * DELETE /api/v1/user/:userId
 */
router.delete('/:userId', wrap(deleteUser));

export default router;
