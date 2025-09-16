// src/services/nutritionEnricher.ts
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

type UserServingRow = { label: string; grams: number | string };

const r1 = (n: number) => Math.round(n * 10) / 10;
const nz = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const npos = (v: unknown, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : fallback;
};

// NEW: normalize phrase like "1 bowl rice" => "rice"
function normalizeBaseTerm(q: string): string {
  const s = (q || '').toLowerCase();
  // remove counts (1, 2x, 1.5x)
  let t = s.replace(/\b\d+(\.\d+)?\s*(x|×)?\b/g, ' ');
  // remove measure words
  const MEASURES =
    'bowl|katori|cup|cups|plate|spoon|tbsp|tsp|glass|ml|gm|g|gram|grams|kg|piece|pieces|pcs|slice|slices';
  t = t.replace(new RegExp(`\\b(${MEASURES})\\b`, 'g'), ' ');
  // remove glue words
  t = t.replace(/\b(of|with|and|in|on|a|an|the)\b/g, ' ');
  // collapse spaces
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

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

export async function enrichDetectedItemsWithDB(
  items: DetectedFoodItem[],
  userId?: string
): Promise<DetectedFoodItem[]> {
  if (!items?.length) return items;
  const supabase = getSupabase();

  return await Promise.all(
    items.map(async (item) => {
      const termRaw = String(item?.name || '').trim();
      if (!termRaw) return item;

      const termLower = termRaw.toLowerCase();
      const baseTerm = normalizeBaseTerm(termLower); // <— "1 bowl rice" => "rice"
      const tryTerms = Array.from(
        new Set([termLower, baseTerm].filter(Boolean))
      );

      // 1) Try personal_food_lookup then ingredient_lookup for each candidate term
      let pick: PersonalLookupRow | null = null;

      for (const q of tryTerms) {
        if (pick) break;
        try {
          const { data, error } = await supabase.rpc('personal_food_lookup', {
            q,
            p_user_id: userId ?? null,
            max_results: 5,
          });
          if (!error && Array.isArray(data) && data.length) {
            const row = data[0] as PersonalLookupRow;
            pick = row;
            break;
          }
        } catch {
          /* ignore */
        }
        try {
          const { data, error } = await supabase.rpc('ingredient_lookup', {
            q,
            max_results: 1,
          });
          if (!error && Array.isArray(data) && data.length) {
            const r = data[0] as IngredientLookupRow;
            pick = {
              kind: 'ingredient',
              id: r.ingredient_id,
              name: r.name,
              default_serving_g: 100,
              calories_per_100g: r.calories_per_100g,
              protein_per_100g: r.protein_per_100g,
              carbs_per_100g: r.carbs_per_100g,
              fat_per_100g: r.fat_per_100g,
              confidence: r.confidence,
              source: r.source,
            };
            break;
          }
        } catch {
          /* ignore */
        }
      }

      if (!pick) return item; // leave unchanged if nothing matched

      // 2) user_servings override (use original phrase for label matching like "1 bowl")
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
      const servingHit =
        userServings.find((s) =>
          termLower.includes(String(s.label || '').toLowerCase())
        ) || null;

      // 3) Compute macros at chosen grams
      const per100 = {
        calories_per_100g: nz(pick.calories_per_100g),
        protein_per_100g: nz(pick.protein_per_100g),
        carbs_per_100g: nz(pick.carbs_per_100g),
        fat_per_100g: nz(pick.fat_per_100g),
      };
      const grams =
        npos(servingHit?.grams) ||
        npos(item?.portionSize?.estimatedGrams) ||
        npos(pick.default_serving_g) ||
        100;

      const m = macrosFromPer100(per100, grams);
      const per100Snapshot = {
        calories: Math.round(per100.calories_per_100g),
        protein: r1(per100.protein_per_100g),
        carbs: r1(per100.carbs_per_100g),
        fat: r1(per100.fat_per_100g),
      };

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

      (updated as any).nutritionPer100g =
        (item as any).nutritionPer100g || per100Snapshot;

      (updated as any).dbMatch = {
        kind: pick.kind,
        id: pick.id,
        source: pick.source,
        confidence: nz(pick.confidence),
        appliedServingLabel: servingHit?.label ?? null,
        triedTerms: tryTerms,
      };

      return updated;
    })
  );
}
