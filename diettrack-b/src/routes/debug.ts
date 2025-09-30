// src/routes/debug.ts
import { Router, Request, Response } from 'express';
import { validateBase64Image } from '@/utils/imageHash';
import { getSupabase } from '@/database/supabase';

const router = Router();

/** POST /api/v1/debug/echo */
router.post('/echo', (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
    },
  });
});

/** POST /api/v1/debug/validate-image */
router.post('/validate-image', (req: Request, res: Response) => {
  const image = String(req.body?.image || '');
  const valid = validateBase64Image(image);

  const m = image.match(/^data:image\/(\w+);base64,([A-Za-z0-9+/=]+)$/);
  const mime = m?.[1] ? `image/${m[1]}` : null;
  const bytes = m?.[2] ? Math.floor(m[2].length * 0.75) : 0;

  return res.json({ success: true, data: { valid, bytes, mime } });
});

/** GET /api/v1/debug/personal-lookup?q=...&userId=... */
router.get('/personal-lookup', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '');
    const userId = String(req.query.userId || '');
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('personal_food_lookup', {
      q,
      p_user_id: userId || null,
      max_results: 5,
    });

    if (error) {
      return res
        .status(500)
        .json({ success: false, error: error.message || 'DB error' });
    }
    return res.json({ success: true, q, userId, data });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'Unexpected error' });
  }
});

/** GET /api/v1/debug/ingredient-lookup?q=... */
router.get('/ingredient-lookup', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '');
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('ingredient_lookup', {
      q,
      max_results: 5,
    });

    if (error) {
      return res
        .status(500)
        .json({ success: false, error: error.message || 'DB error' });
    }
    return res.json({ success: true, q, data });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'Unexpected error' });
  }
});

export default router;
