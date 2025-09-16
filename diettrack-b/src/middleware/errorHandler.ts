// src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

export interface HttpError extends Error {
  status?: number;
  code?: string;
  expose?: boolean;
  details?: unknown;
}

export function createHttpError(
  status: number,
  message: string,
  code?: string,
  details?: unknown
): HttpError {
  const err: HttpError = new Error(message);
  err.status = status;
  if (code) err.code = code;
  if (details) err.details = details;
  // expose 4xx messages to client by default, hide 5xx
  err.expose = status >= 400 && status < 500;
  return err;
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = typeof err.status === 'number' ? err.status : 500;
  const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
  const message =
    err.expose && err.message
      ? err.message
      : status >= 500
        ? 'Internal server error'
        : 'Bad request';

  if (status >= 500) {
    logger.error('[ERROR_HANDLER] 5xx', {
      status,
      code,
      message: err.message,
      stack: err.stack,
      details: err.details,
    });
  } else {
    logger.warn('[ERROR_HANDLER] 4xx', {
      status,
      code,
      message: err.message,
      details: err.details,
    });
  }

  return res.status(status).json({
    success: false,
    error: message,
    code,
  });
}
