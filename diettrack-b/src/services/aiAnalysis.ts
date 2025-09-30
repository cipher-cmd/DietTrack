// src/services/aiAnalysis.ts
import logger from '@/utils/logger';
import type { DetectedFoodItem } from '@/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type ProviderName = 'gemini' | 'vision';

export interface AIAnalysisResult {
  provider: ProviderName;
  detectedItems: DetectedFoodItem[];
  confidence: number; // 0..1
  processingTimeMs: number;
  rawResponse?: unknown;
}

// Strategy - Gemini only for MVP
const AI_STRATEGY = 'gemini_only' as
  | 'gemini_only'
  | 'vision_only'
  | 'both';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const r1 = (n: unknown) => Math.round((Number(n) || 0) * 10) / 10;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function stripCodeFences(s: string) {
  if (!s) return s;
  return s
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}
function tryJsonParse(s: string, fallback: any): any {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
function withTimeout<T>(p: Promise<T>, ms: number, tag = 'task'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${tag} timeout after ${ms}ms`)),
      ms
    );
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

function normalizeItemsFromLLM(items: any[]): DetectedFoodItem[] {
  let nextId = 1;
  return (items || []).map((raw) => {
    const id = Number(raw?.itemId) || Number(raw?.id) || nextId++;

    const grams =
      Number(raw?.portion_g) ||
      Number(raw?.portionSize?.estimatedGrams) ||
      Number(raw?.portion_size?.estimated_grams) ||
      150;

    let serving: 'small' | 'medium' | 'large' = 'medium';
    if (grams < 80) serving = 'small';
    else if (grams > 200) serving = 'large';

    const conf =
      typeof raw?.confidence === 'number'
        ? raw.confidence
        : typeof raw?.score === 'number'
        ? raw.score
        : 0.6;

    return {
      itemId: id,
      name: String(raw?.name || raw?.label || 'food').toLowerCase(),
      confidence: clamp01(conf),
      region: raw?.region ?? { x: 100, y: 100, width: 200, height: 200 },
      nutrition: {
        calories: Math.round(Number(raw?.calories ?? 0)),
        protein: r1(raw?.protein ?? 0),
        carbs: r1(raw?.carbs ?? 0),
        fat: r1(raw?.fat ?? 0),
        fiber: r1(raw?.fiber ?? 0),
        sugar: r1(raw?.sugar ?? 0),
        sodium: Math.round(Number(raw?.sodium ?? 0)),
        cholesterol: Math.round(Number(raw?.cholesterol ?? 0)),
      },
      alternatives: Array.isArray(raw?.alternatives) ? raw.alternatives : [],
      portionSize: {
        estimatedGrams: grams,
        confidenceRange: {
          min: Math.round(grams * 0.85),
          max: Math.round(grams * 1.15),
        },
        servingSizeCategory: serving,
      },
      cookingMethod: raw?.cookingMethod ?? 'boiled',
      ingredients: Array.isArray(raw?.ingredients) ? raw.ingredients : [],
    };
  });
}

/* ------------------------ Gemini provider ------------------------ */
async function runGeminiJSON(parts: any[]): Promise<any> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  // Use explicit "contents" shape (more stable across SDK versions)
  const req = { contents: [{ role: 'user', parts }] };
  const result = await model.generateContent(req);

  // Extract text safely across SDK versions
  const rawText: string =
    (result?.response?.text && result.response.text()) ||
    result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';

  const cleaned = stripCodeFences(rawText);
  const fallback = { detected_items: [], overall_confidence: 0.6 };
  const json: any = tryJsonParse(cleaned, fallback);

  if (Array.isArray(json?.detectedItems) && json?.overallConfidence != null) {
    return json;
  }
  if (Array.isArray(json?.detected_items)) {
    return {
      detectedItems: json.detected_items,
      overallConfidence:
        typeof json.overall_confidence === 'number'
          ? json.overall_confidence
          : 0.6,
    };
  }
  return { detectedItems: [], overallConfidence: 0.6 };
}

async function analyzeWithGemini(params: {
  image: string; // data URL (data:image/...;base64,...)
  userContext?: Record<string, any>;
  referenceObject?: Record<string, any>;
  userId?: string;
}): Promise<AIAnalysisResult> {
  const started = Date.now();

  if (!GEMINI_API_KEY) {
    logger.warn('[Gemini] GEMINI_API_KEY missing; returning empty result');
    return {
      provider: 'gemini',
      detectedItems: [],
      confidence: 0.5,
      processingTimeMs: Date.now() - started,
    };
  }

  const m = params.image?.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!m) {
    // No image (controller will handle text-only fallback)
    return {
      provider: 'gemini',
      detectedItems: [],
      confidence: 0.5,
      processingTimeMs: Date.now() - started,
    };
  }
  const ext = m[1].toLowerCase();
  const data = m[2];
  const mimeType = `image/${ext}`;

  const systemPrompt = `
You are a nutrition analysis assistant. Return ONLY strict JSON with this exact shape:

{
  "detected_items": [
    {
      "itemId": 1,
      "name": "roti",
      "confidence": 0.7,
      "portion_size": { "estimated_grams": 120 },
      "calories": 200,
      "protein": 6,
      "carbs": 35,
      "fat": 4
    }
  ],
  "overall_confidence": 0.6
}

Rules:
- Prefer Indian dish names when applicable.
- If unsure, keep confidence <= 0.6.
- If multiple items are present, assign stable itemId (1..N).
- Do NOT include any non-JSON text. No markdown, no prose.
`.trim();

  const userPrompt = params.userContext?.prompt
    ? `User context: ${String(params.userContext.prompt)}`
    : 'No extra user context.';

  const parts = [
    { text: systemPrompt + '\n' + userPrompt },
    { inlineData: { mimeType, data } }, // SDK wants raw base64, no prefix
  ];

  try {
    const json: any = await withTimeout(runGeminiJSON(parts), 15000, 'gemini');
    const items =
      Array.isArray(json?.detectedItems) && json.detectedItems.length
        ? json.detectedItems
        : Array.isArray(json?.detected_items)
        ? json.detected_items
        : [];

    const normalized = normalizeItemsFromLLM(items);
    const conf =
      typeof json?.overallConfidence === 'number'
        ? json.overallConfidence
        : typeof json?.overall_confidence === 'number'
        ? json.overall_confidence
        : normalized.length
        ? normalized.reduce((s, it) => s + (it.confidence || 0.6), 0) /
          normalized.length
        : 0.6;

    return {
      provider: 'gemini',
      detectedItems: normalized,
      confidence: clamp01(conf),
      processingTimeMs: Date.now() - started,
      rawResponse: json,
    };
  } catch (err) {
    logger.error('[Gemini] analysis failed', err);
    return {
      provider: 'gemini',
      detectedItems: [],
      confidence: 0.5,
      processingTimeMs: Date.now() - started,
    };
  }
}

/* ------------------------ Vision provider (stub) ------------------------ */
async function analyzeWithVisionOnly(_params: {
  image: string;
  userContext?: Record<string, any>;
  referenceObject?: Record<string, any>;
  userId?: string;
}): Promise<AIAnalysisResult> {
  const started = Date.now();
  return {
    provider: 'vision',
    detectedItems: [],
    confidence: 0.5,
    processingTimeMs: Date.now() - started,
  };
}

/* --------------------- Multi-provider orchestration --------------------- */
async function runProviders(params: {
  image: string;
  userContext?: Record<string, any>;
  referenceObject?: Record<string, any>;
  userId?: string;
}): Promise<AIAnalysisResult[]> {
  const jobs: Array<Promise<AIAnalysisResult>> = [];

  if (AI_STRATEGY === 'gemini_only') {
    jobs.push(analyzeWithGemini(params));
  } else if (AI_STRATEGY === 'vision_only') {
    jobs.push(analyzeWithVisionOnly(params));
  } else {
    jobs.push(analyzeWithGemini(params));
    jobs.push(analyzeWithVisionOnly(params));
  }

  const results = await Promise.allSettled(jobs);
  const ok: AIAnalysisResult[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') ok.push(r.value);
    else logger.error('[AI] provider failed', r.reason);
  }
  return ok;
}

function combineAnalysisResults(
  analyses: AIAnalysisResult[]
): AIAnalysisResult {
  if (!analyses.length) {
    return {
      provider: 'vision',
      detectedItems: [],
      confidence: 0.5,
      processingTimeMs: 0,
    };
  }
  if (analyses.length === 1) return analyses[0];

  const byKey = new Map<string, DetectedFoodItem[]>();
  const makeKey = (it: DetectedFoodItem, idx: number) => {
    const id = Number((it as any)?.itemId);
    if (Number.isFinite(id) && id > 0) return `id:${id}`;
    const nm = (it?.name || '').toString().toLowerCase().trim();
    if (nm) return `name:${nm}`;
    return `idx:${idx}`;
  };

  for (const a of analyses) {
    a.detectedItems.forEach((it, idx) => {
      const k = makeKey(it, idx);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(it);
    });
  }

  const combined: DetectedFoodItem[] = [];
  let i = 0;
  for (const group of byKey.values()) {
    const base = group[0];
    const avgConf =
      group.reduce((s, x) => s + (x.confidence || 0.6), 0) / group.length;
    combined.push({
      ...base,
      itemId: Number(base.itemId ?? i + 1),
      confidence: clamp01(avgConf),
    });
    i++;
  }

  const avg =
    analyses.reduce((s, a) => s + (a.confidence || 0.5), 0) / analyses.length;

  return {
    provider: analyses.some((a) => a.provider === 'gemini')
      ? 'gemini'
      : 'vision',
    detectedItems: combined,
    confidence: clamp01(avg),
    processingTimeMs: Math.max(...analyses.map((a) => a.processingTimeMs)),
    rawResponse: analyses,
  };
}

/* ------------------------- Public API (stable) ------------------------- */
export async function analyzeImage(params: {
  imageBase64: string;
  userContext?: Record<string, any>;
  referenceObject?: Record<string, any>;
  userId?: string;
}): Promise<{
  detectedItems: DetectedFoodItem[];
  overallConfidence: number;
  provider: ProviderName;
  processingTimeMs: number;
  raw?: unknown;
}> {
  try {
    const results = await runProviders({
      image: params.imageBase64,
      userContext: params.userContext,
      referenceObject: params.referenceObject,
      userId: params.userId,
    });

    if (!results.length) {
      return {
        detectedItems: [],
        overallConfidence: 0.5,
        provider: 'vision',
        processingTimeMs: 0,
      };
    }

    const combined = combineAnalysisResults(results);
    return {
      detectedItems: combined.detectedItems,
      overallConfidence: combined.confidence,
      provider: combined.provider,
      processingTimeMs: combined.processingTimeMs,
      raw: combined.rawResponse,
    };
  } catch (err) {
    logger.error('[AI] analyzeImage failed', err);
    return {
      detectedItems: [],
      overallConfidence: 0.5,
      provider: 'vision',
      processingTimeMs: 0,
    };
  }
}

export const aiAnalysisService = {
  multiModelAnalysis: runProviders,
  combineAnalysisResults,
};
