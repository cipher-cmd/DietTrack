// src/services/mealLogService.ts
import { getSupabase } from '@/database/supabase';
import logger from '@/utils/logger';

type MealLogItem = { food_id: string; quantity: number; unit?: string };
export type CreateMealLogPayload = {
  user_id: string;
  meal_type?: string;
  consumed_at?: string; // ISO
  items: MealLogItem[];
};

// Simple placeholder; replace with real totals later
async function calculateTotals(_items: CreateMealLogPayload['items']) {
  return {
    total_energy: 500,
    total_protein: 25,
    total_carbs: 50,
    total_fats: 20,
    total_fiber: 5,
  };
}

export async function createMealLog(
  payload: CreateMealLogPayload
): Promise<{ success: boolean; error?: any }> {
  const supabase = getSupabase();
  const totals = await calculateTotals(payload.items);

  const { data: mealLog, error: mealLogError } = await supabase
    .from('meal_logs')
    .insert({
      user_id: payload.user_id,
      meal_type: payload.meal_type ?? null,
      consumed_at: payload.consumed_at ?? new Date().toISOString(),
      source: 'backend',
      ...totals,
    })
    .select('id')
    .single();

  if (mealLogError) {
    logger.error('Failed to create meal log', { error: mealLogError });
    return { success: false, error: mealLogError };
  }

  const items = payload.items.map((it) => ({
    meal_log_id: mealLog.id,
    food_id: it.food_id,
    quantity: it.quantity,
    unit: it.unit ?? 'g',
    energy: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
  }));

  const { error: itemsError } = await supabase
    .from('meal_log_items')
    .insert(items);
  if (itemsError) {
    logger.error('Failed to create meal log items', { error: itemsError });
    await supabase.from('meal_logs').delete().eq('id', mealLog.id);
    return { success: false, error: itemsError };
  }

  return { success: true };
}
