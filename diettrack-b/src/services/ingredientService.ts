// src/services/ingredientService.ts
import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabase } from '@/database/supabase';

export type IngredientMatch = {
  ingredient_id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  servings: Array<{ label: string; grams: number }>;
  confidence: number;
  source: string;
};

export async function lookupIngredientsByName(
  name: string,
  limit = 8
): Promise<{ matches: IngredientMatch[]; error?: PostgrestError | null }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('ingredient_lookup', {
    q: name,
    max_results: limit,
  });

  return { matches: (data as IngredientMatch[]) || [], error };
}
