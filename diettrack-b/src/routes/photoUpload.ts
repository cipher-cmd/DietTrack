// src/routes/photoUpload.ts
// Route for uploading a meal photo (with rate limiting).

import { Router } from 'express';
import { uploadPhoto } from '@/controllers/photoUploadController';
import { uploadLimiter } from '@/middleware/rateLimiter'; // ✅ correct import name

const router = Router();

/**
 * POST /api/v1/photo-upload
 * Accepts a base64 image or multipart upload and stores it (rate-limited).
 */
router.post('/', uploadLimiter, uploadPhoto); // ✅ use the correct middleware

export default router;
