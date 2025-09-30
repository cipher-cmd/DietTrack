// src/services/ingredientService.ts
import { getSupabase } from '@/database/supabase';

export type IngredientMatch = {
  id: string;
  canonical_name: string;
  portion_grams: number | null;
  nutrition: {
    kcal?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sodium_mg?: number;
  } | null;
  source: 'ifct';
  confidence: number;
};

export async function lookupIngredientsByName(
  name: string,
  limit = 8
): Promise<{ matches: IngredientMatch[]; error?: any }> {
  const supabase = getSupabase();
  // Pragmatic OR across canonical + array fields; case-insensitive
  const { data, error } = await supabase
    .from('ifct_foods')
    .select(
      'id, canonical_name, regional_names, search_keywords, portion_grams, nutrition'
    )
    .or(
      `canonical_name.ilike.%${name}%,regional_names.cs.{${name}},search_keywords.cs.{${name}}`
    )
    .limit(limit);

  if (error) return { matches: [], error };

  const matches: IngredientMatch[] = (data || []).map((row: any) => ({
    id: row.id,
    canonical_name: row.canonical_name,
    portion_grams: row.portion_grams ?? null,
    nutrition: row.nutrition ?? null,
    source: 'ifct' as const,
    confidence: 0.8,
  }));

  return { matches, error: null };
}
