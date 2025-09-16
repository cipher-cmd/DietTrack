// src/middleware/validation.ts
// Validates analysis + feedback payloads. Minimal + predictable error codes.

import type { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createHttpError } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// Simple inline image data-URL pattern
const IMAGE_DATAURL_RE =
  /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i;

// Shared: userContext (allow unknown future fields)
const userContextSchema = Joi.object({
  prompt: Joi.string().allow('').optional(),
  location: Joi.string().allow('').optional(),
}).unknown(true);

// NOTE: userId is TEXT in DB, so keep it optional + free-formish
const userIdText = Joi.string().allow('', null).optional();

// ----- /analysis/analyze -----
const analyzeSchema = Joi.object({
  image: Joi.string().pattern(IMAGE_DATAURL_RE).optional(),

  // camelCase + snake_case accepted
  userContext: userContextSchema.optional(),
  user_context: userContextSchema.optional(),

  referenceObject: Joi.string()
    .valid(
      'katori',
      'plate',
      'coin_10_rupee',
      'spoon_steel',
      'phone',
      'bowl',
      'hand'
    )
    .optional(),
  reference_object: Joi.string()
    .valid(
      'katori',
      'plate',
      'coin_10_rupee',
      'spoon_steel',
      'phone',
      'bowl',
      'hand'
    )
    .optional(),

  userId: userIdText,
}).custom((value, helpers) => {
  const hasImage = !!value.image;
  const prompt =
    value?.userContext?.prompt ?? value?.user_context?.prompt ?? '';
  if (!hasImage && !String(prompt).trim()) {
    return helpers.error('any.custom', {
      message: 'Provide a photo or a description.',
    });
  }
  return value;
}, 'image or prompt requirement');

export function validateAnalysisRequest(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const { error, value } = analyzeSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false,
    convert: true,
  });

  if (error) {
    const msg =
      error.details
        ?.map((d) => (d.context as any)?.message || d.message)
        .join('; ') ||
      error.message ||
      'Bad input';

    // Special-case: match the controller’s historical code for missing inputs.
    const code = msg.includes('Provide a photo or a description.')
      ? 'MISSING_INPUT'
      : 'BAD_INPUT';

    logger.warn('[VALIDATION] analysis/analyze failed', { msg, code });
    return next(createHttpError(400, msg, code));
  }

  req.body = value;
  next();
}

// ----- /feedback (POST) -----
const feedbackSchema = Joi.object({
  analysisId: Joi.string()
    .guid({ version: ['uuidv4', 'uuidv1', 'uuidv5', 'uuidv3'] })
    .required(),
  userId: userIdText,
  helpful: Joi.boolean().optional(),
  comment: Joi.string().max(500).allow('', null).optional(),
});

export function validateFeedbackSubmission(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const { error, value } = feedbackSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const msg =
      error.details?.map((d) => d.message).join('; ') || error.message;
    logger.warn('[VALIDATION] feedback failed', { msg });
    return next(createHttpError(400, msg, 'BAD_INPUT'));
  }

  req.body = value;
  next();
}
