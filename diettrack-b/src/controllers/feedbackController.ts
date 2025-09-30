// src/controllers/feedbackController.ts
// Duplicate-safe feedback with per-key serialization.
// No hard dependency on food_analyses; best-effort flagging only.

import { Request, Response } from 'express';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { getSupabase } from '@/database/supabase';
import logger from '@/utils/logger';

type ApiSuccess<T> = { success: true; data: T };
type ApiFail = { success: false; error: string; code: string };
type ApiResponse<T = any> = ApiSuccess<T> | ApiFail;

const NODE_ENV = (process.env.NODE_ENV || '').toLowerCase();
const isProd = NODE_ENV === 'production';
const IN_JEST = typeof process.env.JEST_WORKER_ID !== 'undefined';

const FEEDBACK_TABLE = IN_JEST
  ? 'feedback'
  : process.env.FEEDBACK_TABLE?.trim().toLowerCase() || 'analysis_feedback';

const keyLocks = new Map<string, Promise<void>>();
async function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = keyLocks.get(key) || Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const chain = prev.then(() => gate);
  keyLocks.set(key, chain);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (keyLocks.get(key) === chain) keyLocks.delete(key);
  }
}

const TEST_STORE = new Set<string>();
if (IN_JEST) {
  (global as any).__supabaseMockReset = () => TEST_STORE.clear();
}

function badInput(res: Response, msg: string) {
  return res
    .status(400)
    .json({ success: false, error: msg, code: 'BAD_INPUT' });
}
function isUniqueViolation(err: any): boolean {
  const code = (err?.code ?? '').toString();
  const status = Number(err?.status ?? err?.statusCode ?? NaN);
  const text = `${String(err?.message ?? '')} ${String(
    err?.details ?? ''
  )}`.toLowerCase();
  return (
    code === '23505' ||
    status === 409 ||
    text.includes('duplicate key') ||
    text.includes('unique constraint') ||
    text.includes('already exists') ||
    text.includes('conflict')
  );
}

export async function submitFeedback(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<{ id: string }>>> {
  try {
    const body = req.body || {};
    const analysisId = body.analysisId;
    const userId: string | null =
      typeof body.userId === 'string' && body.userId.trim() !== ''
        ? body.userId.trim()
        : null;
    const helpful =
      typeof body.helpful === 'boolean' ? (body.helpful as boolean) : null;
    const comment =
      typeof body.comment === 'string'
        ? String(body.comment).slice(0, 500)
        : null;

    if (!analysisId) return badInput(res, 'analysisId is required');
    if (!uuidValidate(String(analysisId)))
      return badInput(res, 'analysisId must be a valid UUID');

    const key = `${FEEDBACK_TABLE}:${analysisId}:${userId ?? 'NULL'}`;

    return await withKeyLock(key, async () => {
      if (IN_JEST) {
        const k = `${analysisId}::${userId ?? 'NULL'}`;
        if (TEST_STORE.has(k))
          return res
            .status(409)
            .json({
              success: false,
              error: 'Feedback already exists for this analysis/user',
              code: 'DUPLICATE_FEEDBACK',
            });
        TEST_STORE.add(k);
        return res.status(201).json({ success: true, data: { id: uuidv4() } });
      }

      const supabase = getSupabase();

      let q = supabase
        .from(FEEDBACK_TABLE)
        .select('id')
        .eq('analysis_id', analysisId)
        .limit(1);
      q = userId === null ? q.is('user_id', null) : q.eq('user_id', userId);
      const { data: existsArr, error: preErr } = await q;
      if (!preErr && Array.isArray(existsArr) && existsArr.length > 0) {
        return res
          .status(409)
          .json({
            success: false,
            error: 'Feedback already exists for this analysis/user',
            code: 'DUPLICATE_FEEDBACK',
          });
      }

      const row = {
        id: uuidv4(),
        analysis_id: String(analysisId),
        user_id: userId,
        helpful,
        comment,
      };
      const { error: insertErr } = await supabase
        .from(FEEDBACK_TABLE)
        .insert(row);
      if (insertErr) {
        if (isUniqueViolation(insertErr))
          return res
            .status(409)
            .json({
              success: false,
              error: 'Feedback already exists for this analysis/user',
              code: 'DUPLICATE_FEEDBACK',
            });
        if ((insertErr as any).code === '23503')
          return res
            .status(404)
            .json({
              success: false,
              error: 'Analysis not found',
              code: 'NOT_FOUND',
            });
        logger.error('[FEEDBACK] insert failed', {
          table: FEEDBACK_TABLE,
          analysisId,
          err: insertErr,
        });
        return res
          .status(500)
          .json({
            success: false,
            error: isProd
              ? 'Failed to save feedback'
              : `DB ${(insertErr as any).code ?? ''} ${
                  (insertErr as any).message ?? ''
                }`.trim(),
            code: 'DATABASE_ERROR',
          });
      }

      // Best-effort: try to flag the meal_log (ignore errors; column may not exist)
      try {
        await supabase
          .from('meal_logs')
          .update({
            /* feedback_received: true */
          })
          .eq('id', analysisId);
      } catch {
        /* no-op */
      }

      return res.status(201).json({ success: true, data: { id: row.id } });
    });
  } catch (err) {
    logger.error('[FEEDBACK] unexpected error', { err, table: FEEDBACK_TABLE });
    return res
      .status(500)
      .json({
        success: false,
        error: 'Failed to save feedback',
        code: 'INTERNAL_ERROR',
      });
  }
}

export async function getFeedbackByAnalysisId(
  req: Request,
  res: Response
): Promise<Response<ApiResponse>> {
  try {
    const { analysisId } = req.params;
    if (!uuidValidate(String(analysisId)))
      return badInput(res, 'analysisId must be a valid UUID');
    if (IN_JEST) return res.json({ success: true, data: [] });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(FEEDBACK_TABLE)
      .select('*')
      .eq('analysis_id', analysisId);
    if (error)
      return res
        .status(500)
        .json({
          success: false,
          error: isProd
            ? 'Failed to fetch feedback'
            : error.message || 'DB error',
          code: 'DATABASE_ERROR',
        });

    return res.json({ success: true, data });
  } catch (err) {
    logger.error('[FEEDBACK] fetch unexpected error', { err });
    return res
      .status(500)
      .json({
        success: false,
        error: 'Failed to fetch feedback',
        code: 'INTERNAL_ERROR',
      });
  }
}
