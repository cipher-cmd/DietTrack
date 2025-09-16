import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '@/database/supabase';
import logger from '@/utils/logger';
import { ApiResponse } from '@/types';

interface UploadResponse {
  imageUrl: string;
  fileName: string;
  fileSize: number;
}

/**
 * Upload photo to Supabase Storage with optimized handling
 */
export const uploadPhoto = async (
  req: Request,
  res: Response
): Promise<Response<ApiResponse<UploadResponse>>> => {
  try {
    const raw = req.body?.image;
    const image = typeof raw === 'string' ? raw.trim() : '';

    const { userId, mealType = 'unknown' } = req.body || {};

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Valid base64 image is required',
        code: 'INVALID_IMAGE',
      });
    }

    // Validate and extract base64 data (case-insensitive, trimmed)
    const base64Match = image.match(
      /^data:image\/(\w+);base64,([A-Za-z0-9+/=]+)$/i
    );
    if (!base64Match) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Expected data:image/...;base64,...',
        code: 'INVALID_FORMAT',
      });
    }

    const [, imageTypeRaw, base64Data] = base64Match;
    const imageType = imageTypeRaw.toLowerCase();

    // Validate image type
    const allowedTypes = ['jpeg', 'jpg', 'png', 'webp'];
    if (!allowedTypes.includes(imageType)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported image type. Allowed: JPEG, PNG, WebP',
        code: 'UNSUPPORTED_TYPE',
      });
    }

    // Decode
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Validate file size (e.g., 5MB limit)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (imageBuffer.length > maxSizeBytes) {
      return res.status(400).json({
        success: false,
        error: 'Image too large. Maximum size is 5MB',
        code: 'FILE_TOO_LARGE',
      });
    }

    const supabase = getSupabase();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'meal_images';
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileExtension = imageType === 'jpeg' ? 'jpg' : imageType;
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `meals/${userId || 'guest'}/${date}/${fileName}`;

    logger.info('[UPLOAD] Starting upload', {
      userId,
      mealType,
      fileSize: imageBuffer.length,
      filePath,
    });

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, imageBuffer, {
        contentType: `image/${imageType}`,
        upsert: false,
        cacheControl: '3600',
        metadata: {
          userId: userId || 'guest',
          mealType,
          originalSize: imageBuffer.length.toString(),
          uploadedAt: new Date().toISOString(),
        },
      });

    if (uploadError) {
      logger.error('[UPLOAD] Supabase upload error', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Upload failed',
        code: 'UPLOAD_ERROR',
      });
    }

    // Public URL (if bucket is public). If private, switch to createSignedUrl.
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    logger.info('[UPLOAD] Success', {
      userId,
      filePath,
      publicUrl: publicUrlData.publicUrl,
    });

    return res.json({
      success: true,
      data: {
        imageUrl: publicUrlData.publicUrl,
        fileName: filePath,
        fileSize: imageBuffer.length,
      },
    });
  } catch (error) {
    logger.error('[UPLOAD] Unexpected error', error);
    return res.status(500).json({
      success: false,
      error: 'Upload failed due to server error',
      code: 'INTERNAL_ERROR',
    });
  }
};
