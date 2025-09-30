// src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

export interface HttpError extends Error {
  status?: number; // HTTP status code
  code?: string; // Short machine code (e.g., 'BAD_REQUEST')
  expose?: boolean; // Whether to expose the message to clients
  details?: unknown; // Optional structured details
}

export function createHttpError(
  status: number,
  message: string,
  code?: string,
  details?: unknown
): HttpError {
  const err: HttpError = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  // Expose 4xx by default; hide 5xx by default
  err.expose = status >= 400 && status < 500;
  return err;
}

/**
 * Global error handler — must be registered AFTER all routes.
 * - Always returns JSON { success: false, error, code }
 * - Avoids leaking stack traces in 5xx
 * - Respects `err.expose` and `headersSent`
 */
export function errorHandler(
  err: HttpError | unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    // eslint-disable-next-line no-console
    console.error(
      '[ERROR_HANDLER] headers already sent; cannot write response'
    );
    return;
  }

  const isHttp = !!(err as HttpError)?.status || !!(err as HttpError)?.code;
  const httpErr =
    (isHttp ? (err as HttpError) : undefined) || ({} as HttpError);

  const status = typeof httpErr.status === 'number' ? httpErr.status : 500;
  const code =
    httpErr.code || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');

  const expose =
    typeof httpErr.expose === 'boolean'
      ? httpErr.expose
      : status >= 400 && status < 500;

  const safeMessage =
    expose && (httpErr.message || '').trim()
      ? httpErr.message!.trim()
      : status >= 500
        ? 'Internal server error'
        : 'Bad request';

  // Structured logging (5xx as error, 4xx as warn)
  const logPayload = {
    status,
    code,
    message: (err as any)?.message,
    stack: (err as any)?.stack,
    details: (err as any)?.details,
  };

  if (status >= 500) {
    logger.error('[ERROR_HANDLER] 5xx', logPayload);
  } else {
    logger.warn('[ERROR_HANDLER] 4xx', logPayload);
  }

  // Always respond JSON
  return res.status(status).json({
    success: false,
    error: safeMessage,
    code,
  });
}
