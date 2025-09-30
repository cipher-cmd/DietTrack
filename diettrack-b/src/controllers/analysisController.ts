// src/controllers/analysisController.ts
// MVP controller wired to `meal_logs` table.
// - Accepts photo OR text prompt
// - Runs model(s) + IFCT enrichment
// - Summarizes macros
// - Persists one cohesive meal_log row
// - Stable response shape for app

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '@/database/supabase';
import { analyzeImage } from '@/services/aiAnalysis';
import { enrichWithIFCTData, getIFCTFoodByName } from '@/services/ifctService';
import { hashBase64Image, validateBase64Image } from '@/utils/imageHash';
import logger from '@/utils/logger';
import type {
  AnalysisRequest,
  ApiResponse,
  DetectedFoodItem,
  ServingSize,
} from '@/types';

// ──────────────────────────────────────────────────────────────────────────────
// Utils
// ──────────────────────────────────────────────────────────────────────────────
const r1 = (n: unknown) => Math.round((Number(n) || 0) * 10) / 10;
const clamp0 = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const zNut = () => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
  cholesterol: 0,
});

type NutritionSummary = {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
};

type IngredientAddOn = {
  name: string;
  grams?: number;
  unit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
type AddOnInput = Partial<IngredientAddOn> & { name?: string };

// grams-only add-on inference (quick presets)
const addOnR1 = (n: number) => Math.round(n * 10) / 10;
const ADD_ON_PRESETS = [
  {
    test: (s: string) => s.includes('ghee') || s.includes('oil'),
    cal_g: 9,
    pro_g: 0,
    carb_g: 0,
    fat_g: 1,
  },
  {
    test: (s: string) => s.includes('butter'),
    cal_g: 7.2,
    pro_g: 0.01,
    carb_g: 0.01,
    fat_g: 0.8,
  },
  {
    test: (s: string) => s.includes('cheese') || s.includes('paneer'),
    cal_g: 4.0,
    pro_g: 0.25,
    carb_g: 0.02,
    fat_g: 0.33,
  },
];
function inferAddOnFromPreset(name: string, grams: number) {
  const key = name.toLowerCase();
  const p = ADD_ON_PRESETS.find((x) => x.test(key));
  if (!p) return null;
  return {
    calories: Math.round(p.cal_g * grams),
    protein: addOnR1(p.pro_g * grams),
    carbs: addOnR1(p.carb_g * grams),
    fat: addOnR1(p.fat_g * grams),
  };
}
function normalizeAddOns(addOns: AddOnInput[]): IngredientAddOn[] {
  if (!Array.isArray(addOns) || !addOns.length) return [];
  return addOns
    .map((raw) => {
      const name = String(raw?.name || '').trim();
      if (!name) return null;
      const grams = clamp0(Number(raw?.grams ?? 0));
      const unit = raw?.unit ? String(raw.unit).trim() : undefined;
      const provided = {
        calories: Math.round(Math.max(0, Number(raw?.calories ?? 0))),
        protein: addOnR1(Math.max(0, Number(raw?.protein ?? 0))),
        carbs: addOnR1(Math.max(0, Number(raw?.carbs ?? 0))),
        fat: addOnR1(Math.max(0, Number(raw?.fat ?? 0))),
      };
      const hasProvided = Object.values(provided).some((v) => v > 0);
      const inferred =
        !hasProvided && grams ? inferAddOnFromPreset(name, grams) : null;
      const macros = inferred || provided;
      if (!macros.calories && !macros.protein && !macros.carbs && !macros.fat)
        return null;
      return {
        name,
        grams: grams || undefined,
        unit,
        ...macros,
      } as IngredientAddOn;
    })
    .filter(Boolean) as IngredientAddOn[];
}

// IFCT helpers
function toIFCTDetectFormat(items: ReadonlyArray<any>) {
  return items.map((it, idx) => ({
    itemId: Number(it.itemId ?? idx + 1),
    name: String(it.name || '').toLowerCase(),
    portion_g:
      it.portion_g ??
      it.portionSize?.estimatedGrams ??
      it.portion_size?.estimated_grams ??
      100,
    confidence: typeof it.confidence === 'number' ? it.confidence : 0.6,
    source: it.source || 'ai',
  }));
}
function mapEnrichedToDetected(
  enriched: any[],
  raw: DetectedFoodItem[]
): DetectedFoodItem[] {
  const byId = new Map<number, DetectedFoodItem>(
    raw.map((it) => [Number(it.itemId), it])
  );
  return enriched.map((e, idx) => {
    const id = Number(e.itemId ?? idx + 1);
    const base = byId.get(id) || raw[idx];
    const grams =
      e.portion_g ??
      e.portion_size_g ??
      base?.portionSize?.estimatedGrams ??
      100;
    const servingSizeCategory: ServingSize =
      grams < 80 ? 'small' : grams > 200 ? 'large' : 'medium';

    const n_cal = Math.round(
      clamp0(
        Number(e.energy_kcal_per_serving ?? base?.nutrition?.calories ?? 0)
      )
    );
    const n_pro = r1(e.protein_g_per_serving ?? base?.nutrition?.protein ?? 0);
    const n_car = r1(e.carbs_g_per_serving ?? base?.nutrition?.carbs ?? 0);
    const n_fat = r1(e.fat_g_per_serving ?? base?.nutrition?.fat ?? 0);
    const n_fib = r1(e.fiber_g_per_serving ?? base?.nutrition?.fiber ?? 0);
    const n_sug = r1(e.sugar_g_per_serving ?? base?.nutrition?.sugar ?? 0);
    const n_sod = Math.round(
      clamp0(Number(e.sodium_mg_per_serving ?? base?.nutrition?.sodium ?? 0))
    );
    const n_cho = Math.round(
      clamp0(
        Number(
          e.cholesterol_mg_per_serving ?? base?.nutrition?.cholesterol ?? 0
        )
      )
    );

    const item: DetectedFoodItem = {
      itemId: id,
      name: e.display_name || e.ifct_name || e.name || base?.name || 'food',
      confidence:
        typeof e.confidence === 'number'
          ? Math.max(0, Math.min(1, e.confidence))
          : base?.confidence ?? 0.6,
      region: base?.region ?? { x: 100, y: 100, width: 200, height: 200 },
      nutrition: {
        calories: n_cal,
        protein: n_pro as number,
        carbs: n_car as number,
        fat: n_fat as number,
        fiber: n_fib as number,
        sugar: n_sug as number,
        sodium: n_sod,
        cholesterol: n_cho,
      },
      alternatives: base?.alternatives ?? [],
      portionSize: {
        estimatedGrams: grams,
        confidenceRange: base?.portionSize?.confidenceRange ?? {
          min: Math.round(grams * 0.85),
          max: Math.round(grams * 1.15),
        },
        servingSizeCategory,
      },
      cookingMethod: base?.cookingMethod ?? 'boiled',
      ingredients: base?.ingredients ?? [],
    };

    (item as any).nutritionPer100g = (base as any)?.nutritionPer100g || {
      calories: grams ? Math.round((n_cal * 100) / grams) : 0,
      protein: grams ? r1(((n_pro as number) * 100) / grams) : 0,
      carbs: grams ? r1(((n_car as number) * 100) / grams) : 0,
      fat: grams ? r1(((n_fat as number) * 100) / grams) : 0,
      fiber: grams ? r1(((n_fib as number) * 100) / grams) : 0,
      sugar: grams ? r1(((n_sug as number) * 100) / grams) : 0,
      sodium: grams ? Math.round((n_sod * 100) / grams) : 0,
      cholesterol: grams ? Math.round((n_cho * 100) / grams) : 0,
    };
    return item;
  });
}

// text fallback
async function parseTextToItems(text: string): Promise<DetectedFoodItem[]> {
  const parts = text
    .split(/[,+/&]| with | and /i)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: DetectedFoodItem[] = [];
  for (const p of parts) {
    const ifct = await getIFCTFoodByName(p);
    const portionG = clamp0((ifct as any)?.serving_size_g) || 150;
    const serving: ServingSize =
      portionG < 80 ? 'small' : portionG > 200 ? 'large' : 'medium';
    const item: DetectedFoodItem = {
      itemId: out.length + 1,
      name: p.toLowerCase(),
      confidence: ifct ? 0.7 : 0.5,
      region: { x: 100, y: 100, width: 200, height: 200 },
      nutrition: zNut(),
      alternatives: [],
      portionSize: {
        estimatedGrams: portionG,
        confidenceRange: {
          min: Math.round(portionG * 0.85),
          max: Math.round(portionG * 1.15),
        },
        servingSizeCategory: serving,
      },
      cookingMethod: 'boiled',
      ingredients: [],
    };
    (item as any).nutritionPer100g = zNut();
    out.push(item);
  }
  if (out.length) return out;
  const portionG = 150;
  const fallback: DetectedFoodItem = {
    itemId: 1,
    name: text.toLowerCase(),
    confidence: 0.5,
    region: { x: 100, y: 100, width: 200, height: 200 },
    nutrition: zNut(),
    alternatives: [],
    portionSize: {
      estimatedGrams: portionG,
      confidenceRange: { min: 128, max: 173 },
      servingSizeCategory: 'medium',
    },
    cookingMethod: 'boiled',
    ingredients: [],
  };
  (fallback as any).nutritionPer100g = zNut();
  return [fallback];
}

// ──────────────────────────────────────────────────────────────────────────────
// Controllers
// ──────────────────────────────────────────────────────────────────────────────
export const analyzeFood = async (
  req: Request,
  res: Response
): Promise<Response<ApiResponse<any>>> => {
  const started = Date.now();
  const reqId = uuidv4();

  try {
    const rawBody =
      typeof req.body === 'string'
        ? (() => {
            try {
              return JSON.parse(req.body);
            } catch {
              return {};
            }
          })()
        : req.body || {};
    const payload: AnalysisRequest & {
      userId?: string;
      addOns?: AddOnInput[];
    } = {
      image: String(rawBody.image ?? ''),
      userContext: rawBody.userContext ?? rawBody.user_context ?? {},
      referenceObject: rawBody.referenceObject ?? rawBody.reference_object,
    };
    const userId: string | undefined = rawBody.userId;
    const addOns = normalizeAddOns(
      Array.isArray(rawBody.addOns) ? rawBody.addOns : []
    );
    const promptText: string = String(
      (payload.userContext as any)?.prompt ?? rawBody.prompt ?? ''
    ).trim();
    const image: string =
      typeof payload.image === 'string' ? payload.image : '';
    const hasImage = image.length > 0;
    const hasPrompt = promptText.length > 0;

    if (!hasImage && !hasPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Provide a photo or a description.',
        code: 'MISSING_INPUT',
      });
    }

    logger.info(
      `[ANALYSIS START] id=${reqId} user=${userId || 'anon'} src=${
        hasImage ? 'image' : 'prompt'
      }`
    );

    let imageHash: string | null = null;
    if (hasImage) {
      if (!validateBase64Image(image)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image data URL',
          code: 'BAD_IMAGE',
        });
      }
      imageHash = hashBase64Image(image);
    }

    // 1) detect
    let detectedRaw: DetectedFoodItem[] = [];
    if (hasImage) {
      const ai = await analyzeImage({
        imageBase64: image,
        userContext: payload.userContext as any,
        referenceObject: payload.referenceObject as any,
        userId,
      });
      detectedRaw = Array.isArray(ai?.detectedItems)
        ? (ai.detectedItems as DetectedFoodItem[])
        : [];
      if (detectedRaw.length === 0 && hasPrompt) {
        logger.info(`[ANALYSIS] empty detections; fallback to prompt parse`);
        detectedRaw = await parseTextToItems(promptText);
      }
    } else {
      detectedRaw = await parseTextToItems(promptText);
    }

    // 2) IFCT enrichment
    const normalized = toIFCTDetectFormat(detectedRaw);
    let enriched: any[] = [];
    try {
      enriched = await enrichWithIFCTData(normalized);
    } catch (e) {
      logger.error(`[IFCT] enrichment failed id=${reqId}`, e);
      enriched = normalized;
    }

    // 3) final UI items
    const displayItems: DetectedFoodItem[] = mapEnrichedToDetected(
      enriched,
      detectedRaw
    );

    // 4) totals
    const nutritionSummary: NutritionSummary = {
      total_calories: Math.round(
        displayItems.reduce((sum, it) => sum + (it.nutrition.calories || 0), 0)
      ),
      total_protein: r1(
        displayItems.reduce((s, it) => s + (it.nutrition.protein || 0), 0)
      ) as number,
      total_carbs: r1(
        displayItems.reduce((s, it) => s + (it.nutrition.carbs || 0), 0)
      ) as number,
      total_fat: r1(
        displayItems.reduce((s, it) => s + (it.nutrition.fat || 0), 0)
      ) as number,
    };
    for (const x of addOns) {
      nutritionSummary.total_calories += Math.round(Number(x.calories || 0));
      nutritionSummary.total_protein = r1(
        nutritionSummary.total_protein + Number(x.protein || 0)
      ) as number;
      nutritionSummary.total_carbs = r1(
        nutritionSummary.total_carbs + Number(x.carbs || 0)
      ) as number;
      nutritionSummary.total_fat = r1(
        nutritionSummary.total_fat + Number(x.fat || 0)
      ) as number;
    }

    // 5) persist to meal_logs
    const supabase = getSupabase();
    const summaryText = `${displayItems[0]?.name ?? 'Meal'}${
      displayItems.length > 1 ? ` + ${displayItems.length - 1} more` : ''
    } • ~${nutritionSummary.total_calories} kcal • ${
      nutritionSummary.total_protein
    }g P`;

    const { data: inserted, error: insertError } = await supabase
      .from('meal_logs')
      .insert([
        {
          user_id: userId || null,
          source: hasImage ? 'photo' : 'text',
          source_ref: null, // hook this to uploads table later if needed
          items: displayItems,
          add_ons: addOns,
          portion_scalar: 1.0,
          nutrition_total: {
            kcal: nutritionSummary.total_calories,
            protein_g: nutritionSummary.total_protein,
            carbs_g: nutritionSummary.total_carbs,
            fat_g: nutritionSummary.total_fat,
          },
          nutrition_breakdown: {
            items: displayItems.map((d) => ({
              itemId: d.itemId,
              grams: d.portionSize.estimatedGrams,
              ...d.nutrition,
            })),
            add_ons: addOns,
          },
          summary: summaryText,
        },
      ])
      .select('id, logged_at')
      .single();

    if (insertError || !inserted) {
      logger.error('[ANALYZE] DB insert failed', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save meal log',
        code: 'DATABASE_ERROR',
      });
    }

    const processingTime = Date.now() - started;
    return res.json({
      success: true,
      data: {
        meal_log_id: inserted.id,
        logged_at: inserted.logged_at,
        items: displayItems,
        add_ons: addOns,
        nutritionSummary,
        processing_time: `${processingTime}ms`,
      },
    });
  } catch (error) {
    logger.error('[ANALYSIS ERR]', error);
    return res.status(500).json({
      success: false,
      error: 'Analysis failed due to server error',
      code: 'INTERNAL_ERROR',
    });
  }
};

// History -> meal_logs
export const getAnalysisHistory = async (req: Request, res: Response) => {
  try {
    const { userId, limit = '20', offset = '0' } = req.query;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required for history',
        code: 'MISSING_USER_ID',
      });
    }
    const parsedLimit = Math.min(parseInt(String(limit)) || 20, 100);
    const parsedOffset = parseInt(String(offset)) || 0;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .range(parsedOffset, parsedOffset + parsedLimit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch history',
        code: 'DATABASE_ERROR',
      });
    }

    return res.json({
      success: true,
      data: {
        items: data || [],
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          has_more: (data?.length || 0) === parsedLimit,
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
      code: 'INTERNAL_ERROR',
    });
  }
};

// By ID -> meal_logs
export const getAnalysisById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({
        success: false,
        error: 'Meal log ID is required',
        code: 'MISSING_ID',
      });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data)
      return res.status(404).json({
        success: false,
        error: 'Meal log not found',
        code: 'NOT_FOUND',
      });
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch meal log',
      code: 'INTERNAL_ERROR',
    });
  }
};
