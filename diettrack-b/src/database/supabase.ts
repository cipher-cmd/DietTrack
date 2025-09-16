// src/database/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';

let client: SupabaseClient | null = null;

/** Lazily create/get the server-side Supabase admin client (service role). */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim();
  const key =
    (process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) ||
    (process.env.SUPABASE_KEY && process.env.SUPABASE_KEY.trim()); // legacy fallback

  if (!url || !key) {
    throw new Error(
      `Supabase credentials missing. SUPABASE_URL: ${!!url}, SUPABASE_SERVICE_ROLE_KEY: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: { headers: { 'x-application-name': 'diettrack-backend/1.0.0' } },
  });

  logger.info('Supabase client (service role) created');
  return client;
}

/** Optional eager export; safe to keep for modules that import a ready instance. */
export const supabase: SupabaseClient = getSupabase();

export default supabase;
