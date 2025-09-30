// diettrack-b/src/controllers/userController.ts
// User CRUD + preferences. Supabase-safe, works with v1/v2 (.maybeSingle fallback).

import { Request, Response } from 'express';
import { getSupabase } from '@/database/supabase';
import logger from '@/utils/logger';
import type { User, ApiResponse } from '@/types';

// ---------- helpers ----------
const pick = <T extends Record<string, any>>(obj: T, keys: string[]) =>
  keys.reduce((acc: Record<string, any>, k) => {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined)
      acc[k] = obj[k];
    return acc;
  }, {});
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
const getReqUserId = (req: Request): string | undefined =>
  (req.params as any).userId ||
  (req.query.userId as string) ||
  (req.headers['x-user-id'] as string) ||
  (req.body?.userId as string);

async function vMaybeSingle<T = any>(
  query: any
): Promise<{ data: T | null; error: any }> {
  if (typeof query.maybeSingle === 'function') return query.maybeSingle();
  try {
    const { data } = await query.limit(1).single();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

// ---------- controllers ----------
export async function createUser(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<User>>> {
  try {
    const body = req.body || {};
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!phone)
      return res.status(400).json({
        success: false,
        error: 'Phone is required',
        code: 'MISSING_PHONE',
      });

    const name =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : null;
    const location =
      typeof body.location === 'string' && body.location.trim()
        ? body.location.trim()
        : null;
    const dietary_preferences = asStringArray(body.dietary_preferences);
    const allergies = asStringArray(body.allergies);

    const supabase = getSupabase();
    const query = supabase.from('users').select('id, phone').eq('phone', phone);
    const { data: existingUser, error: findErr } = await vMaybeSingle<{
      id: string;
      phone: string;
    }>(query);
    if (findErr && existingUser === null) {
      logger.error('[USER] Lookup by phone failed', { err: findErr, phone });
      return res.status(500).json({
        success: false,
        error: 'Failed to check existing user',
        code: 'DATABASE_ERROR',
      });
    }
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this phone number already exists',
        code: 'USER_EXISTS',
      });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          phone,
          name,
          location,
          dietary_preferences,
          allergies,
          free_analyses_used: 0,
          subscription_status: 'free_trial',
        },
      ])
      .select('*')
      .single();

    if (error || !data) {
      logger.error('[USER] Create insert failed', { err: error });
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
        code: 'DATABASE_ERROR',
      });
    }

    logger.info('[USER] Created', { userId: data.id, phone });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error('[USER] Create unexpected error', { err: error });
    return res.status(500).json({
      success: false,
      error: 'Failed to create user',
      code: 'INTERNAL_ERROR',
    });
  }
}

export async function getUserProfile(req: Request, res: Response) {
  try {
    const userId = getReqUserId(req);
    if (!userId)
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        code: 'MISSING_USER_ID',
      });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data)
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });

    return res.json({ success: true, data });
  } catch (error) {
    logger.error('[USER] Get profile error', { err: error });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      code: 'INTERNAL_ERROR',
    });
  }
}

export async function updateUserProfile(req: Request, res: Response) {
  try {
    const userId = getReqUserId(req);
    if (!userId)
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        code: 'MISSING_USER_ID',
      });

    const allowed = ['name', 'location', 'dietary_preferences', 'allergies'];
    const updateData = pick(req.body || {}, allowed);
    if ('dietary_preferences' in updateData)
      updateData.dietary_preferences = asStringArray(
        updateData.dietary_preferences
      );
    if ('allergies' in updateData)
      updateData.allergies = asStringArray(updateData.allergies);
    if (Object.keys(updateData).length === 0)
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
        code: 'NO_FIELDS',
      });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single();
    if (error) {
      logger.error('[USER] Update failed', { err: error, userId });
      return res.status(500).json({
        success: false,
        error: 'Failed to update user profile',
        code: 'DATABASE_ERROR',
      });
    }
    if (!data)
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });

    logger.info('[USER] Updated', { userId });
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('[USER] Update unexpected error', { err: error });
    return res.status(500).json({
      success: false,
      error: 'Failed to update user profile',
      code: 'INTERNAL_ERROR',
    });
  }
}

export async function saveUserPreferences(req: Request, res: Response) {
  try {
    const userId = getReqUserId(req);
    const preferences = (req.body?.preferences as Record<string, any>) ?? {};
    if (!userId)
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        code: 'MISSING_USER_ID',
      });

    const allowed = ['dietary_preferences', 'allergies'];
    const toWrite = pick(preferences, allowed);
    if ('dietary_preferences' in toWrite)
      toWrite.dietary_preferences = asStringArray(toWrite.dietary_preferences);
    if ('allergies' in toWrite)
      toWrite.allergies = asStringArray(toWrite.allergies);
    if (Object.keys(toWrite).length === 0)
      return res.status(400).json({
        success: false,
        error: 'No valid preference fields',
        code: 'NO_FIELDS',
      });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .update({ ...toWrite, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single();
    if (error || !data) {
      logger.error('[USER] Preferences update failed', { err: error, userId });
      return res.status(500).json({
        success: false,
        error: 'Failed to save preferences',
        code: 'DATABASE_ERROR',
      });
    }
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('[USER] Preferences unexpected error', { err: error });
    return res.status(500).json({
      success: false,
      error: 'Failed to save preferences',
      code: 'INTERNAL_ERROR',
    });
  }
}

export async function getUserStats(req: Request, res: Response) {
  try {
    const userId = getReqUserId(req);
    if (!userId)
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        code: 'MISSING_USER_ID',
      });

    const supabase = getSupabase();
    const { count, error: cErr } = await supabase
      .from('meal_logs') // ← switched from food_analyses
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (cErr) {
      logger.error('[USER] Stats count failed', { err: cErr, userId });
      return res.status(500).json({
        success: false,
        error: 'Failed to compute user stats',
        code: 'DATABASE_ERROR',
      });
    }

    const stats = {
      meals_logged: count || 0,
      streak_days: 0,
      analyses_remaining: Math.max(0, 10 - (count || 0)),
      total_feedback_given: 0,
    };

    return res.json({ success: true, data: { stats } });
  } catch (error) {
    logger.error('[USER] Get stats error', { err: error });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
      code: 'INTERNAL_ERROR',
    });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const userId = getReqUserId(req);
    if (!userId)
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        code: 'MISSING_USER_ID',
      });
    const supabase = getSupabase();
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) {
      logger.error('[USER] Delete failed', { err: error, userId });
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        code: 'DATABASE_ERROR',
      });
    }
    logger.info('[USER] Deleted', { userId });
    return res.json({
      success: true,
      data: { message: 'User account deleted successfully' },
    });
  } catch (error) {
    logger.error('[USER] Delete unexpected error', { err: error });
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      code: 'INTERNAL_ERROR',
    });
  }
}
