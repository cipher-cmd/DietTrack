// src/controllers/feedbackController.ts
// Clean validation + friendly DB error handling (duplicate, FK, etc.)

import { Request, Response } from 'express';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { getSupabase } from '@/database/supabase';
import logger from '@/utils/logger';

type ApiSuccess<T> = { success: true; data: T };
type ApiFail = { success: false; error: string; code: string };
type ApiResponse<T = any> = ApiSuccess<T> | ApiFail;

const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const FEEDBACK_TABLE =
  process.env.FEEDBACK_TABLE?.trim().toLowerCase() || 'analysis_feedback';

function badInput(res: Response, msg: string) {
  return res
    .status(400)
    .json({ success: false, error: msg, code: 'BAD_INPUT' });
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

    if (!analysisId) {
      return badInput(res, 'analysisId is required');
    }
    if (!uuidValidate(String(analysisId))) {
      return badInput(res, 'analysisId must be a valid UUID');
    }

    const row = {
      id: uuidv4(),
      analysis_id: String(analysisId),
      user_id: userId, // TEXT or null
      helpful,
      comment,
    };

    const supabase = getSupabase();

    const { error: insertErr } = await supabase
      .from(FEEDBACK_TABLE)
      .insert(row)
      .select('id')
      .single();

    if (insertErr) {
      const code = (insertErr as any).code || '';
      if (code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'Feedback already exists for this analysis/user',
          code: 'DUPLICATE_FEEDBACK',
        });
      }
      if (code === '23503') {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found',
          code: 'NOT_FOUND',
        });
      }

      logger.error('[FEEDBACK] insert failed', {
        table: FEEDBACK_TABLE,
        analysisId,
        err: insertErr,
      });
      return res.status(500).json({
        success: false,
        error: isProd
          ? 'Failed to save feedback'
          : `DB ${code} ${insertErr.message || ''}`.trim(),
        code: 'DATABASE_ERROR',
      });
    }

    // Best-effort: mark analysis row
    const { error: updErr } = await supabase
      .from('food_analyses')
      .update({ feedback_received: true })
      .eq('id', analysisId);

    if (updErr) {
      logger.warn('[FEEDBACK] could not flag analysis row', {
        analysisId,
        err: updErr,
      });
    }

    logger.info('[FEEDBACK] saved', {
      analysisId,
      userId,
      helpful: !!helpful,
      table: FEEDBACK_TABLE,
    });

    return res.status(201).json({ success: true, data: { id: row.id } });
  } catch (err) {
    logger.error('[FEEDBACK] unexpected error', { err, table: FEEDBACK_TABLE });
    return res.status(500).json({
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
    if (!uuidValidate(String(analysisId))) {
      return badInput(res, 'analysisId must be a valid UUID');
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(FEEDBACK_TABLE)
      .select('*')
      .eq('analysis_id', analysisId);

    if (error) {
      logger.error('[FEEDBACK] fetch failed', { analysisId, err: error });
      return res.status(500).json({
        success: false,
        error: isProd
          ? 'Failed to fetch feedback'
          : error.message || 'DB error',
        code: 'DATABASE_ERROR',
      });
    }

    return res.json({ success: true, data });
  } catch (err) {
    logger.error('[FEEDBACK] fetch unexpected error', { err });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback',
      code: 'INTERNAL_ERROR',
    });
  }
}
