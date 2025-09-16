// diettrack-b/src/services/promptLogger.ts
// Best-effort DB logger. If DB is missing or fails, never crash the request.

import { getDatabase } from '@/database/connection';
import logger from '@/utils/logger';

export interface PromptLogInsertData {
  user_id?: string;
  model_provider: string;
  prompt_version: string;
  ai_version?: string;
  image_hash: string;
  detected_items: any[];
  response_confidence: number;
  user_feedback?: string;
}

export async function logPromptResult(log: PromptLogInsertData) {
  if (!log || typeof log !== 'object') throw new Error('Invalid log object');

  try {
    const db = getDatabase();
    await (db as any).query(
      `
      INSERT INTO prompt_logs (
        user_id,
        model_provider,
        prompt_version,
        ai_version,
        image_hash,
        detected_items,
        response_confidence,
        user_feedback
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        log.user_id ?? null,
        log.model_provider,
        log.prompt_version,
        log.ai_version ?? null,
        log.image_hash,
        JSON.stringify(log.detected_items ?? []),
        Number(log.response_confidence),
        log.user_feedback ?? null,
      ]
    );
  } catch (err) {
    // Non-fatal by design
    logger.debug('Prompt log DB error (non-fatal)', { err });
  }
}
