// src/services/indianFoodDatabase.ts
import { getDatabase } from '@/database/connection';
import logger from '@/utils/logger';
import { cacheGet, cacheSet } from '@/database/redis';
import { IFCTFood, NutritionFacts, CookingVariation } from '@/types';

/**
 * Maps a DB row (snake_case) to IFCTFood (camelCase)
 */
function mapRowToIFCTFood(row: any): IFCTFood {
  const nut = row.nutrition_per_100g || {};
  return {
    id: row.id,
    foodName: row.name,
    regionalNames: row.regional_names || [],
    category: row.category || 'prepared_foods',
    nutritionPer100g: {
      calories: Number(nut.calories ?? 0),
      protein: Number(nut.protein ?? 0),
      carbs: Number(nut.carbs ?? 0),
      fat: Number(nut.fat ?? 0),
      fiber: Number(nut.fiber ?? 0),
      sugar: Number(nut.sugar ?? 0),
      sodium: Number(nut.sodium ?? 0),
      cholesterol: Number(nut.cholesterol ?? 0),
    },
    cookingVariations: (row.cooking_variations || []).map(
      (v: any): CookingVariation => ({
        method: v.method ?? v.cooking_method ?? 'boiled',
        oilFactor: Number(v.oilFactor ?? v.oil_factor ?? 1),
        spiceFactor: Number(v.spiceFactor ?? v.spice_factor ?? 1),
        nutrientRetention: Number(
          v.nutrientRetention ?? v.nutrient_retention ?? 1
        ),
        calorieModifier: Number(v.calorieModifier ?? v.calorie_modifier ?? 1),
      })
    ),
    allergens: row.allergens || [],
    isVegetarian: !!row.is_vegetarian,
    isVegan: !!row.is_vegan,
    region: row.region || 'north',
    commonPortions: row.common_portions || [],
    searchKeywords: row.search_keywords || [],
  };
}

/**
 * Safe divide
 */
function perServing(n100: NutritionFacts, grams: number): NutritionFacts {
  const g = grams > 0 ? grams : 100;
  const factor = g / 100;
  return {
    calories: Math.round((n100.calories || 0) * factor),
    protein: Number(((n100.protein || 0) * factor).toFixed(1)),
    carbs: Number(((n100.carbs || 0) * factor).toFixed(1)),
    fat: Number(((n100.fat || 0) * factor).toFixed(1)),
    fiber: Number(((n100.fiber || 0) * factor).toFixed(1)),
    sugar: Number(((n100.sugar || 0) * factor).toFixed(1)),
    sodium: Math.round((n100.sodium || 0) * factor),
    cholesterol: Math.round((n100.cholesterol || 0) * factor),
  };
}

export class IndianFoodDatabaseService {
  /**
   * Full-text search using search_tsv (generated column or trigger-maintained)
   */
  async searchFood(query: string, region?: string): Promise<IFCTFood[]> {
    if (!query || typeof query !== 'string') return [];
    const q = query.trim();
    const cacheKey = `food_search:v2:${q}:${region || 'all'}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const db = getDatabase();
    try {
      let sql = `
        SELECT id, name, regional_names, category, region,
               nutrition_per_100g, cooking_variations, search_keywords,
               search_tsv
        FROM public.ifct_foods
        WHERE search_tsv @@ plainto_tsquery('english', $1)
      `;
      const params: any[] = [q];

      if (region) {
        sql += ` AND region = $2`;
        params.push(region);
      }

      sql += `
        ORDER BY ts_rank(search_tsv, plainto_tsquery('english', $1)) DESC
        LIMIT 10
      `;

      let result = await db.query(sql, params);

      // Fallback to ILIKE if search_tsv is not present yet
      if (!result || result.rows.length === 0) {
        let fallbackSql = `
          SELECT id, name, regional_names, category, region,
                 nutrition_per_100g, cooking_variations, search_keywords
          FROM public.ifct_foods
          WHERE name ILIKE '%' || $1 || '%'
             OR EXISTS (
               SELECT 1 FROM unnest(coalesce(regional_names, '{}'::text[])) r
               WHERE r ILIKE '%' || $1 || '%'
             )
        `;
        const fp: any[] = [q];
        if (region) {
          fallbackSql += ` AND region = $2`;
          fp.push(region);
        }
        fallbackSql += ` LIMIT 10`;
        result = await db.query(fallbackSql, fp);
      }

      const foods = (result.rows || []).map(mapRowToIFCTFood);
      await cacheSet(cacheKey, foods, 3600);
      return foods;
    } catch (err) {
      logger.error('Food search failed', err);
      return [];
    }
  }

  async getFoodById(id: number): Promise<IFCTFood | null> {
    const cacheKey = `food:${id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const db = getDatabase();
    try {
      const { rows } = await db.query(
        `SELECT id, name, regional_names, category, region,
                nutrition_per_100g, cooking_variations, search_keywords
         FROM public.ifct_foods
         WHERE id = $1`,
        [id]
      );
      if (!rows.length) return null;
      const food = mapRowToIFCTFood(rows[0]);
      await cacheSet(cacheKey, food, 7200);
      return food;
    } catch (err) {
      logger.error('Get food by ID failed', err);
      return null;
    }
  }

  /**
   * Validate AI nutrition against DB per-100g. Returns gentle warnings, not hard failures.
   */
  async validateNutrition(
    foodName: string,
    aiNutrition: NutritionFacts
  ): Promise<{
    isValid: boolean;
    confidence: number;
    adjustedNutrition?: NutritionFacts;
    warnings: string[];
  }> {
    if (!foodName) {
      return {
        isValid: false,
        confidence: 0,
        warnings: ['No food name provided'],
      };
    }
    const foods = await this.searchFood(foodName);
    if (!foods.length) {
      return {
        isValid: false,
        confidence: 0.3,
        warnings: ['Food not found in Indian database'],
      };
    }

    const dbFood = foods[0];
    const db100 = dbFood.nutritionPer100g;

    // Compare calories/protein per 100g (AI may be per serving; this is heuristic)
    const eps = 1e-6;
    const calDiff =
      db100.calories > eps
        ? Math.abs((aiNutrition.calories || 0) - db100.calories) /
          db100.calories
        : 0;
    const proDiff =
      db100.protein > eps
        ? Math.abs((aiNutrition.protein || 0) - db100.protein) / db100.protein
        : 0;

    const warnings: string[] = [];
    let confidence = 0.85;

    if (calDiff > 0.3) {
      warnings.push('Calorie estimate differs from typical values');
      confidence -= 0.2;
    }
    if (proDiff > 0.3) {
      warnings.push('Protein estimate differs from typical values');
      confidence -= 0.1;
    }

    const adjusted: NutritionFacts = {
      ...aiNutrition,
      calories: Math.round(
        ((aiNutrition.calories || db100.calories) + db100.calories) / 2
      ),
      protein: Number(
        (((aiNutrition.protein ?? db100.protein) + db100.protein) / 2).toFixed(
          1
        )
      ),
    };

    return {
      isValid: confidence > 0.5,
      confidence: Math.max(0.3, confidence),
      adjustedNutrition: adjusted,
      warnings,
    };
  }

  /**
   * Apply cooking method modifiers if available.
   */
  async applyCookingModifiers(
    foodName: string,
    cookingMethod: string,
    baseNutrition: NutritionFacts
  ): Promise<NutritionFacts> {
    const foods = await this.searchFood(foodName);
    if (!foods.length) return baseNutrition;

    const food = foods[0];
    const v = (food.cookingVariations || []).find((cv) =>
      String(cv.method).toLowerCase().includes(cookingMethod.toLowerCase())
    );
    if (!v) return baseNutrition;

    return {
      ...baseNutrition,
      calories: Math.round(
        (baseNutrition.calories || 0) * (v.calorieModifier || 1)
      ),
      fat: Number(((baseNutrition.fat || 0) * (v.oilFactor || 1)).toFixed(1)),
      protein: Number(
        ((baseNutrition.protein || 0) * (v.nutrientRetention || 1)).toFixed(1)
      ),
    };
  }

  /**
   * Suggest alternatives from same category but other regions.
   */
  async getRegionalAlternatives(
    foodName: string,
    userRegion: string
  ): Promise<string[]> {
    if (!foodName) return [];
    const db = getDatabase();
    try {
      const { rows } = await db.query(
        `
        WITH base AS (
          SELECT category FROM public.ifct_foods
          WHERE name ILIKE $1
          LIMIT 1
        )
        SELECT name, regional_names
        FROM public.ifct_foods
        WHERE category = (SELECT category FROM base)
          AND region IS DISTINCT FROM $2
        LIMIT 5
        `,
        [`%${foodName}%`, userRegion || null]
      );

      const out: string[] = [];
      for (const r of rows) {
        if (r.name) out.push(r.name);
        if (Array.isArray(r.regional_names)) out.push(...r.regional_names);
      }
      return out;
    } catch (err) {
      logger.error('Get regional alternatives failed', err);
      return [];
    }
  }

  async initializeDatabase(): Promise<void> {
    // no-op placeholder for bulk load
    logger.info('Indian Food Database initialization checked');
  }
}

export const indianFoodDatabase = new IndianFoodDatabaseService();
