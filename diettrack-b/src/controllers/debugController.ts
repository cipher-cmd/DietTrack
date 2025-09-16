// src/controllers/debugController.ts
import { Request, Response } from 'express';
import { getSupabase } from '@/database/supabase';

export async function debugPersonalLookup(req: Request, res: Response) {
  const q = String(req.query.q || '');
  const userId = String(req.query.userId || '');
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('personal_food_lookup', {
    q,
    p_user_id: userId || null,
    max_results: 5,
  });
  return res.json({ q, userId, data, error });
}
