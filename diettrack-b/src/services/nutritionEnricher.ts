// src/services/nutritionEnricher.ts
// Recompute each detected item's macros from your DB (ingredients/recipes),
// honoring personal aliases/servings via personal_food_lookup.
// Single source of truth for per-100g -> per-serving math.

import { getSupabase } from '@/database/supabase';
import type { DetectedFoodItem } from '@/types';

type PersonalLookupRow = {
  kind: 'ingredient' | 'recipe';
  id: string;
  name: string;
  default_serving_g: number | string | null;
  calories_per_100g: number | string | null;
  protein_per_100g: number | string | null;
  carbs_per_100g: number | string | null;
  fat_per_100g: number | string | null;
  confidence: number | string | null;
  source: string | null;
};

type IngredientLookupRow = {
  ingredient_id: string;
  name: string;
  calories_per_100g: number | string | null;
  protein_per_100g: number | string | null;
  carbs_per_100g: number | string | null;
  fat_per_100g: number | string | null;
  servings: Array<{ label: string; grams: number }>;
  confidence: number | string | null;
  source: string | null;
};

type UserServingRow = {
  label: string;
  grams: number | string;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const nz = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const npos = (v: unknown, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : fallback;
};

function macrosFromPer100(
  per100: {
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
  },
  grams: number
) {
  const f = grams / 100;
  return {
    calories: Math.round(per100.calories_per_100g * f),
    protein: r1(per100.protein_per_100g * f),
    carbs: r1(per100.carbs_per_100g * f),
    fat: r1(per100.fat_per_100g * f),
  };
}

/** Optional helper used by the controller to provide better model prompts. */
export async function dbTopHintsFromPrompt(
  text: string,
  n = 8
): Promise<string[]> {
  if (!text?.trim()) return [];
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.rpc('db_top_hints', {
      q: text,
      max_results: n,
    });
    if (error || !Array.isArray(data)) return [];
    return (data as Array<{ name: string }>)
      .map((r) => String(r.name))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function enrichDetectedItemsWithDB(
  items: DetectedFoodItem[],
  userId?: string
): Promise<DetectedFoodItem[]> {
  if (!items?.length) return items;

  const supabase = getSupabase();

  const enriched = await Promise.all(
    items.map(async (item) => {
      const term = String(item?.name || '').trim();
      if (!term) return item; // nothing to match

      // 1) Personal + global lookup (ingredients + recipes)
      let pick: PersonalLookupRow | null = null;
      try {
        const { data, error } = await supabase.rpc('personal_food_lookup', {
          q: term,
          p_user_id: userId ?? null,
          max_results: 5,
        });
        if (!error && Array.isArray(data) && data.length) {
          pick = data[0] as PersonalLookupRow; // take best candidate
        }
      } catch {
        // swallow; will fall back
      }

      // 2) Fallback to ingredient_lookup if nothing found
      if (!pick) {
        try {
          const { data, error } = await supabase.rpc('ingredient_lookup', {
            q: term,
            max_results: 1,
          });
          if (!error && Array.isArray(data) && data.length) {
            const row = data[0] as IngredientLookupRow;
            pick = {
              kind: 'ingredient',
              id: row.ingredient_id,
              name: row.name,
              default_serving_g: 100,
              calories_per_100g: row.calories_per_100g,
              protein_per_100g: row.protein_per_100g,
              carbs_per_100g: row.carbs_per_100g,
              fat_per_100g: row.fat_per_100g,
              confidence: row.confidence,
              source: row.source,
            };
          }
        } catch {
          // ignore; we may return the original item unchanged
        }
      }

      if (!pick) return item; // still nothing—leave as-is

      // 3) Optional user_servings override
      let userServings: UserServingRow[] = [];
      if (userId) {
        try {
          const col =
            pick.kind === 'ingredient' ? 'ingredient_id' : 'recipe_id';
          const { data, error } = await supabase
            .from('user_servings')
            .select('label, grams')
            .eq('user_id', userId)
            .eq(col, pick.id)
            .order('grams', { ascending: false });
          if (!error && Array.isArray(data))
            userServings = data as UserServingRow[];
        } catch {
          /* ignore */
        }
      }

      const termLower = term.toLowerCase();
      const matchServing =
        userServings.find((s) =>
          termLower.includes(String(s.label || '').toLowerCase())
        ) || null;

      // 4) Normalize numbers & choose grams
      const per100 = {
        calories_per_100g: nz(pick.calories_per_100g),
        protein_per_100g: nz(pick.protein_per_100g),
        carbs_per_100g: nz(pick.carbs_per_100g),
        fat_per_100g: nz(pick.fat_per_100g),
      };

      // Priority for grams:
      // (a) explicit matched user serving label grams
      // (b) model-estimated grams from detection
      // (c) recipe default or ingredient default (100)
      const grams =
        npos(matchServing?.grams) ||
        npos(item?.portionSize?.estimatedGrams) ||
        npos(pick.default_serving_g) ||
        100;

      // 5) Compute macros
      const m = macrosFromPer100(per100, grams);

      // 6) Build per-100 snapshot for UI/debug
      const per100Snapshot = {
        calories: Math.round(per100.calories_per_100g),
        protein: r1(per100.protein_per_100g),
        carbs: r1(per100.carbs_per_100g),
        fat: r1(per100.fat_per_100g),
      };

      // If an earlier stage left an all-zero snapshot, replace it.
      const existingSnap = (item as any).nutritionPer100g;
      const isZeroSnap =
        !existingSnap ||
        ['calories', 'protein', 'carbs', 'fat'].every(
          (k) => Number(existingSnap?.[k]) === 0
        );

      // 7) Return updated item
      const updated: DetectedFoodItem = {
        ...item,
        name: pick.name || item.name,
        nutrition: {
          ...item.nutrition,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
        },
        portionSize: {
          ...item.portionSize,
          estimatedGrams: grams,
          confidenceRange:
            item.portionSize?.confidenceRange ??
            ({
              min: Math.round(grams * 0.85),
              max: Math.round(grams * 1.15),
            } as any),
          servingSizeCategory:
            grams < 80 ? 'small' : grams > 200 ? 'large' : 'medium',
        },
      };

      (updated as any).nutritionPer100g = isZeroSnap
        ? per100Snapshot
        : existingSnap;

      (updated as any).dbMatch = {
        kind: pick.kind,
        id: pick.id,
        source: pick.source,
        confidence: nz(pick.confidence),
        appliedServingLabel: matchServing?.label ?? null,
      };

      return updated;
    })
  );

  return enriched;
}
