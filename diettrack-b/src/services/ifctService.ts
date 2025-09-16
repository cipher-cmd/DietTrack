// src/services/ifctService.ts
import { getSupabase } from '@/database/supabase';
import logger from '@/utils/logger';

type IngredientLookupRow = {
  ingredient_id: string;
  name: string;
  calories_per_100g: number | string | null;
  protein_per_100g: number | string | null;
  carbs_per_100g: number | string | null;
  fat_per_100g: number | string | null;
  default_serving_g?: number | string | null;
  source?: string | null;
  confidence?: number | string | null;
};

type PersonalLookupRow = {
  kind: 'ingredient' | 'recipe';
  id: string;
  name: string;
  default_serving_g: number | string | null;
  calories_per_100g: number | string | null;
  protein_per_100g: number | string | null;
  carbs_per_100g: number | string | null;
  fat_per_100g: number | string | null;
  confidence?: number | string | null;
  source?: string | null;
};

export interface IFCTFood {
  code: string | null; // not used; kept for compatibility
  name: string;
  energy_kcal_per_100g: number;
  protein_g_per_100g: number;
  fat_g_per_100g: number;
  carbs_g_per_100g: number;
  serving_size_g: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const nz = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const npos = (v: unknown, fb = 0) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : fb;
};

// in-process TTL cache
const CACHE = new Map<string, { v: IFCTFood | null; t: number }>();
const TTL_MS = 5 * 60 * 1000;

async function fetchTopFromDB(q: string): Promise<IFCTFood | null> {
  const supabase = getSupabase();

  // 1) try ingredient_lookup first
  try {
    const { data, error } = await supabase.rpc('ingredient_lookup', {
      q,
      max_results: 1,
    });
    if (!error && Array.isArray(data) && data.length) {
      const row = data[0] as IngredientLookupRow;
      return {
        code: null,
        name: String(row.name || q),
        energy_kcal_per_100g: nz(row.calories_per_100g),
        protein_g_per_100g: nz(row.protein_per_100g),
        fat_g_per_100g: nz(row.fat_per_100g),
        carbs_g_per_100g: nz(row.carbs_per_100g),
        serving_size_g: npos(row.default_serving_g, 100),
      };
    }
  } catch (e) {
    logger.debug('[IFCT] ingredient_lookup failed', e);
  }

  // 2) fallback to personal_food_lookup (no user for global match)
  try {
    const { data, error } = await supabase.rpc('personal_food_lookup', {
      q,
      p_user_id: null,
      max_results: 3,
    });
    if (!error && Array.isArray(data) && data.length) {
      const list = data as PersonalLookupRow[];
      const pick = list.find((r) => r.kind === 'ingredient') || list[0];
      return {
        code: null,
        name: String(pick.name || q),
        energy_kcal_per_100g: nz(pick.calories_per_100g),
        protein_g_per_100g: nz(pick.protein_per_100g),
        fat_g_per_100g: nz(pick.fat_per_100g),
        carbs_g_per_100g: nz(pick.carbs_per_100g),
        serving_size_g: npos(pick.default_serving_g, 100),
      };
    }
  } catch (e) {
    logger.debug('[IFCT] personal_food_lookup failed', e);
  }

  return null;
}

export async function getIFCTFoodByName(
  foodName: string
): Promise<IFCTFood | null> {
  if (!foodName || typeof foodName !== 'string') return null;
  const key = foodName.toLowerCase().trim();
  const now = Date.now();
  const hit = CACHE.get(key);
  if (hit && now - hit.t < TTL_MS) return hit.v;

  const v = await fetchTopFromDB(key);
  CACHE.set(key, { v, t: now });
  return v;
}

export async function enrichWithIFCTData(detectedItems: any[]): Promise<any[]> {
  if (!Array.isArray(detectedItems) || !detectedItems.length) return [];

  // de-dupe names in this request
  const names = Array.from(
    new Set(
      detectedItems
        .map((it) =>
          String(it?.name || '')
            .toLowerCase()
            .trim()
        )
        .filter(Boolean)
    )
  );

  const lookups = await Promise.all(
    names.map(async (n) => [n, await getIFCTFoodByName(n)] as const)
  );
  const byName = new Map<string, IFCTFood | null>(lookups);

  return detectedItems.map((item) => {
    const name = String(item?.name || '')
      .toLowerCase()
      .trim();
    const match = byName.get(name) || null;
    const grams =
      npos(item?.portion_g) ||
      npos(item?.portion_size_g) ||
      npos(item?.portionSize?.estimatedGrams) ||
      npos(match?.serving_size_g, 100);

    const per100 = match
      ? {
          kcal: nz(match.energy_kcal_per_100g),
          pro: nz(match.protein_g_per_100g),
          carb: nz(match.carbs_g_per_100g),
          fat: nz(match.fat_g_per_100g),
        }
      : {
          kcal: nz(item?.calories_per_100g),
          pro: nz(item?.protein_per_100g),
          carb: nz(item?.carbs_per_100g),
          fat: nz(item?.fat_per_100g),
        };

    const f = grams / 100;
    const energy_kcal_per_serving =
      per100.kcal > 0 ? Math.round(per100.kcal * f) : null;
    const protein_g_per_serving = per100.pro > 0 ? r1(per100.pro * f) : null;
    const carbs_g_per_serving = per100.carb > 0 ? r1(per100.carb * f) : null;
    const fat_g_per_serving = per100.fat > 0 ? r1(per100.fat * f) : null;

    return {
      ...item,
      ifct_match: match ? match.name : null,
      ifct_code: match?.code ?? null,
      energy_kcal_per_serving,
      protein_g_per_serving,
      carbs_g_per_serving,
      fat_g_per_serving,
    };
  });
}
