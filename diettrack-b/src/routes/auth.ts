import { Router } from 'express';
const router = Router();

/**
 * Example/test authentication route (expand with JWT auth as needed).
 */
router.get('/example', (req, res) => {
  res.json({ success: true, message: 'Auth route working!' });
});

export default router;
