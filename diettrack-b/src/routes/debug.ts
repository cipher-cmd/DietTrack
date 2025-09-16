// src/routes/debug.ts
import { Router } from 'express';
import { validateBase64Image } from '@/utils/imageHash';
import { debugPersonalLookup } from '@/controllers/debugController';

const router = Router();

/** GET /api/v1/debug/pfl?q=...&userId=...  — call personal_food_lookup directly */
router.get('/pfl', debugPersonalLookup);

/** POST /api/v1/debug/echo  — request echo for quick checks */
router.post('/echo', (req, res) => {
  res.json({
    success: true,
    data: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
    },
  });
});

/** POST /api/v1/debug/validate-image  — quick base64 validation */
router.post('/validate-image', (req, res) => {
  const image = String(req.body?.image || '');
  const valid = validateBase64Image(image);

  // rough size & mime extraction
  const m = image.match(/^data:image\/(\w+);base64,([A-Za-z0-9+/=]+)$/);
  const mime = m?.[1] ? `image/${m[1]}` : null;
  const bytes = m?.[2] ? Math.floor(m[2].length * 0.75) : 0;

  res.json({
    success: true,
    data: { valid, bytes, mime },
  });
});

export default router;
