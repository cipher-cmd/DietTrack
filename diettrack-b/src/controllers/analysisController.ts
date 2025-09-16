// src/controllers/analysisController.ts
// Production-ready analysis controller:
// - Validates input (photo OR prompt)
// - Runs model(s) + IFCT enrichment
// - DB-grounding pass (ingredients/recipes + personal aliases/servings)
// - Summarizes macros
// - Persists analysis safely
// - Clean logs and stable response shape

import { Request, Response } from 'express';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { getSupabase } from '@/database/supabase';
import { aiAnalysisService } from '@/services/aiAnalysis';
import { enrichWithIFCTData, getIFCTFoodByName } from '@/services/ifctService';
import {
  enrichDetectedItemsWithDB,
  dbTopHintsFromPrompt,
} from '@/services/nutritionEnricher';
import { hashBase64Image, validateBase64Image } from '@/utils/imageHash';
import logger from '@/utils/logger';
import type {
  AnalysisRequest,
  AnalysisResponse,
  ApiResponse,
  DetectedFoodItem,
  ServingSize,
} from '@/types';

type NutritionSummary = {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
};

type AnalysisResponseWithSummary = AnalysisResponse & {
  nutritionSummary: NutritionSummary;
};

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

// ── IFCT helpers ──────────────────────────────────────────────────────────────
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

    const per100 =
      grams > 0
        ? {
            calories: Math.round((n_cal * 100) / grams),
            protein: r1((n_pro * 100) / grams),
            carbs: r1((n_car * 100) / grams),
            fat: r1((n_fat * 100) / grams),
            fiber: r1((n_fib * 100) / grams),
            sugar: r1((n_sug * 100) / grams),
            sodium: Math.round((n_sod * 100) / grams),
            cholesterol: Math.round((n_cho * 100) / grams),
          }
        : { ...zNut() };

    const item: DetectedFoodItem = {
      itemId: id,
      name: e.display_name || e.ifct_name || e.name || base?.name || 'food',
      confidence:
        typeof e.confidence === 'number'
          ? Math.max(0, Math.min(1, e.confidence))
          : (base?.confidence ?? 0.6),
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

    (item as any).nutritionPer100g = (base as any)?.nutritionPer100g || per100;
    return item;
  });
}

// ── Text-only parse (fallback when no image) ──────────────────────────────────
async function parseTextToItems(text: string): Promise<DetectedFoodItem[]> {
  const parts = text
    .split(/[,+/&]| with | and /i)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: DetectedFoodItem[] = [];

  for (const p of parts) {
    const ifct = await getIFCTFoodByName(p);
    const portionG = clamp0((ifct as any)?.serving_size_g) || 150;
    let serving: ServingSize = 'medium';
    if (portionG < 80) serving = 'small';
    else if (portionG > 200) serving = 'large';

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

// ── Controllers ───────────────────────────────────────────────────────────────
export const analyzeFood = async (
  req: Request,
  res: Response
): Promise<Response<ApiResponse<AnalysisResponseWithSummary>>> => {
  const started = Date.now();
  const reqId = uuidv4();

  try {
    // Accept JSON body or JSON-stringified body
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

    const payload: AnalysisRequest & { userId?: string } = {
      image: String(rawBody.image ?? ''),
      userContext: rawBody.userContext ?? rawBody.user_context ?? {},
      referenceObject: rawBody.referenceObject ?? rawBody.reference_object,
    };
    const userId: string | undefined = rawBody.userId;

    // 🔧 Normalize image to guaranteed string and use it everywhere
    const image: string =
      typeof payload.image === 'string' ? payload.image : '';
    const promptText: string = String(
      (payload.userContext as any)?.prompt ?? ''
    ).trim();
    const hasImage = image.length > 0;
    const hasPrompt = promptText.length > 0;

    if (!hasImage && !hasPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Provide a photo or a description.',
        code: 'MISSING_INPUT',
      });
    }

    logger.info(`[ANALYSIS START] id=${reqId} user=${userId || 'anon'}`);

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

    // Optional model hints from DB; non-fatal
    let dbHints: string[] = [];
    try {
      if (hasPrompt) dbHints = await dbTopHintsFromPrompt(promptText, 6);
    } catch {
      /* ignore */
    }

    // 1) AI + combine (or text parse), with fallback when image finds nothing
    let detectedRaw: DetectedFoodItem[] = [];
    if (hasImage) {
      const analyses = await aiAnalysisService.multiModelAnalysis({
        image,
        userContext: { ...(payload.userContext as any), dbHints },
        referenceObject: payload.referenceObject as any,
        userId,
      });
      const combined = aiAnalysisService.combineAnalysisResults(analyses);
      detectedRaw = [...combined.detectedItems];

      if (detectedRaw.length === 0 && hasPrompt) {
        logger.info(
          `[ANALYSIS] empty image detections; fallback to prompt parse`
        );
        detectedRaw = await parseTextToItems(promptText);
      }
    } else {
      detectedRaw = await parseTextToItems(promptText);
    }

    // 2) IFCT enrichment (non-fatal)
    const normalized = toIFCTDetectFormat(detectedRaw);
    let enriched: any[] = [];
    try {
      enriched = await enrichWithIFCTData(normalized);
    } catch (e) {
      logger.error(`[IFCT] enrichment failed id=${reqId}`, e);
      enriched = normalized;
    }

    // 3) Build UI items
    let displayItems: DetectedFoodItem[] = mapEnrichedToDetected(
      enriched,
      detectedRaw
    );

    // 3.1) DB-grounding pass (personal aliases/servings + recipes). Non-fatal
    try {
      displayItems = await enrichDetectedItemsWithDB(displayItems, userId);
      logger.debug('[DB ENRICH] after', {
        names: displayItems.map((d) => d.name),
        grams: displayItems.map((d) => d.portionSize?.estimatedGrams),
      });
    } catch (e) {
      logger.warn('[DB ENRICH] fallback to IFCT-only due to error', e);
    }

    // 4) Summary
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

    // 5) Persist
    const supabase = getSupabase();
    const analysisId = uuidv4();

    const { error: insertError } = await supabase.from('food_analyses').insert({
      id: analysisId,
      user_id: userId || null,
      image_hash: imageHash,
      detected_items: displayItems,
      confidence_score: displayItems.length
        ? displayItems.reduce((s, it) => s + (it.confidence || 0.5), 0) /
          displayItems.length
        : 0.5,
      processing_time_ms: Date.now() - started,
      feedback_received: false,
      nutrition_summary: nutritionSummary,
    });

    if (insertError) {
      logger.error(`[ANALYSIS] DB insert failed id=${reqId}`, insertError);
    }

    const processingTime = Date.now() - started;

    const response: AnalysisResponseWithSummary = {
      analysisId,
      detectedItems: displayItems,
      overallConfidence: displayItems.length
        ? displayItems.reduce((s, it) => s + (it.confidence || 0.5), 0) /
          displayItems.length
        : 0.5,
      processing_time: `${processingTime}ms`,
      nutritionSummary,
    };

    logger.info(
      `[ANALYSIS OK] id=${reqId} analysis=${analysisId} items=${displayItems.length} ms=${processingTime}`
    );
    return res.json({ success: true, data: response });
  } catch (error) {
    logger.error(`[ANALYSIS ERR] id=${reqId}`, error);
    return res.status(500).json({
      success: false,
      error: 'Analysis failed due to server error',
      code: 'INTERNAL_ERROR',
    });
  }
};

// ── History ───────────────────────────────────────────────────────────────────
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
      .from('food_analyses')
      .select(
        'id, created_at, confidence_score, detected_items, nutrition_summary, feedback_received'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
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

// ── By ID ─────────────────────────────────────────────────────────────────────
export const getAnalysisById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({
        success: false,
        error: 'Analysis ID is required',
        code: 'MISSING_ID',
      });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('food_analyses')
      .select(
        'id, detected_items, image_url, confidence_score, created_at, user_id, image_hash, processing_time_ms, nutrition_summary, feedback_received, adjusted_items, adjusted_nutrition_summary, adjusted_by, adjusted_at'
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found',
        code: 'NOT_FOUND',
      });
    }

    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis',
      code: 'INTERNAL_ERROR',
    });
  }
};

// ── Save Adjusted ─────────────────────────────────────────────────────────────
export async function saveAdjustedAnalysis(req: Request, res: Response) {
  const { id } = req.params;
  if (!id || !uuidValidate(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid analysis id',
      code: 'BAD_ID',
    });
  }

  try {
    const supabase = getSupabase();

    const { data: row, error: fetchErr } = await supabase
      .from('food_analyses')
      .select('detected_items, user_id')
      .eq('id', id)
      .single();

    if (fetchErr || !row) {
      return res.status(404).json({
        success: false,
        error: 'Original analysis not found',
        code: 'NOT_FOUND',
      });
    }

    const raw =
      typeof req.body === 'string'
        ? (() => {
            try {
              return JSON.parse(req.body);
            } catch {
              return {};
            }
          })()
        : req.body || {};

    const adjusted = Array.isArray(raw.adjustedItems)
      ? (raw.adjustedItems as DetectedFoodItem[])
      : [];
    const addOns = Array.isArray(raw.ingredientAddOns)
      ? (raw.ingredientAddOns as Array<{
          name?: string;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        }>)
      : [];

    if (!adjusted.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload: adjustedItems[] is required',
        code: 'BAD_PAYLOAD',
      });
    }

    const baseItems: DetectedFoodItem[] = (row as any).detected_items || [];
    const baseById = new Map<number, DetectedFoodItem>(
      baseItems.map((it) => [Number(it.itemId), it])
    );

    const unknownIds = adjusted
      .map((a: any) => Number(a?.itemId))
      .filter((x: number) => !baseById.has(x));

    if (unknownIds.length === adjusted.length) {
      return res.status(400).json({
        success: false,
        error: `Unknown itemIds: [${unknownIds.join(', ')}]`,
        code: 'BAD_PAYLOAD',
      });
    }

    const r1n = (n: number) => Math.round(n * 10) / 10;

    const finalItems: DetectedFoodItem[] = adjusted
      .filter((a: any) => baseById.has(Number(a?.itemId)))
      .map((a: any) => {
        const base = baseById.get(Number(a.itemId))!;
        const oldG = Number(base?.portionSize?.estimatedGrams || 0) || 100;
        const newG = Number(a?.portionSize?.estimatedGrams ?? oldG) || oldG;
        const scale = oldG > 0 ? newG / oldG : 1;

        const n = a.nutrition || base.nutrition;
        const scaled = {
          calories: Math.round(
            (n?.calories ?? base.nutrition.calories) * scale
          ),
          protein: r1n((n?.protein ?? base.nutrition.protein) * scale),
          carbs: r1n((n?.carbs ?? base.nutrition.carbs) * scale),
          fat: r1n((n?.fat ?? base.nutrition.fat) * scale),
          fiber: r1n((n?.fiber ?? base.nutrition.fiber) * scale),
          sugar: r1n((n?.sugar ?? base.nutrition.sugar) * scale),
          sodium: Math.round((n?.sodium ?? base.nutrition.sodium) * scale),
          cholesterol: Math.round(
            (n?.cholesterol ?? base.nutrition.cholesterol) * scale
          ),
        };

        const per100 =
          newG > 0
            ? {
                calories: Math.round((scaled.calories * 100) / newG),
                protein: r1n((scaled.protein * 100) / newG),
                carbs: r1n((scaled.carbs * 100) / newG),
                fat: r1n((scaled.fat * 100) / newG),
                fiber: r1n((scaled.fiber * 100) / newG),
                sugar: r1n((scaled.sugar * 100) / newG),
                sodium: Math.round((scaled.sodium * 100) / newG),
                cholesterol: Math.round((scaled.cholesterol * 100) / newG),
              }
            : (base as any).nutritionPer100g;

        const item: DetectedFoodItem = {
          ...base,
          ...a,
          nutrition: scaled,
          portionSize: {
            ...base.portionSize,
            ...a?.portionSize,
            estimatedGrams: newG,
          },
        };
        (item as any).nutritionPer100g =
          (a as any)?.nutritionPer100g ??
          (base as any)?.nutritionPer100g ??
          per100;

        return item;
      });

    const totals: NutritionSummary = finalItems.reduce(
      (acc, it) => {
        acc.total_calories += it.nutrition.calories || 0;
        acc.total_protein = r1(
          acc.total_protein + (it.nutrition.protein || 0)
        ) as number;
        acc.total_carbs = r1(
          acc.total_carbs + (it.nutrition.carbs || 0)
        ) as number;
        acc.total_fat = r1(acc.total_fat + (it.nutrition.fat || 0)) as number;
        return acc;
      },
      {
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
      } as NutritionSummary
    );

    for (const x of addOns) {
      totals.total_calories += Math.round(Number(x.calories || 0));
      totals.total_protein = r1(
        totals.total_protein + Number(x.protein || 0)
      ) as number;
      totals.total_carbs = r1(
        totals.total_carbs + Number(x.carbs || 0)
      ) as number;
      totals.total_fat = r1(totals.total_fat + Number(x.fat || 0)) as number;
    }

    const adjustedBy: string | null =
      typeof (raw as any).userId === 'string' && (raw as any).userId.trim()
        ? (raw as any).userId.trim()
        : ((row as any).user_id as string | null) || null;

    const { data: updated, error: updErr } = await supabase
      .from('food_analyses')
      .update({
        adjusted_items: finalItems,
        adjusted_nutrition_summary: totals,
        feedback_received: true,
        adjusted_by: adjustedBy,
        adjusted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, adjusted_by, adjusted_at, feedback_received')
      .single();

    if (updErr) {
      logger.error('[ANALYSIS] Save adjusted failed', updErr);
      return res.status(500).json({
        success: false,
        error: 'Failed to save adjusted analysis',
        code: 'DATABASE_ERROR',
      });
    }

    return res.json({
      success: true,
      data: {
        analysisId: id,
        adjustedItems: finalItems,
        ingredientAddOns: addOns,
        nutritionSummary: totals,
        ignoredItemIds: unknownIds.filter(
          (x) => !finalItems.find((fi) => Number((fi as any).itemId) === x)
        ),
        source: 'adjusted',
      },
    });
  } catch (error) {
    logger.error('[ANALYSIS] Adjusted endpoint error', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save adjusted analysis',
      code: 'INTERNAL_ERROR',
    });
  }
}
