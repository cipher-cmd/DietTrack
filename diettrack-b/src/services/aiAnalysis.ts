// src/services/aiAnalysis.ts
import logger from '@/utils/logger';
import type { DetectedFoodItem } from '@/types';

export type ProviderName = 'gemini' | 'vision';

export interface AIAnalysisResult {
  provider: ProviderName;
  detectedItems: DetectedFoodItem[];
  confidence: number; // 0..1
  processingTimeMs: number;
  rawResponse?: unknown;
}

const AI_STRATEGY = (process.env.AI_STRATEGY || 'gemini_only') as
  | 'gemini_only'
  | 'vision_only'
  | 'both';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// ---------------- JSON helpers ----------------
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

// Ask Gemini for JSON via prompt (no responseMimeType) and parse safely.
async function runGeminiJSON(parts: any[]): Promise<any> {
  // Lazy import to keep build green when key is absent.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleGenerativeAI } = require('@google/generative-ai') as any;
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await model.generateContent(parts);
  const rawText: string =
    result?.response?.text?.() ??
    result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
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

// ---------------- Normalization helpers ----------------
function round1(n: number) {
  return Math.round((Number(n) || 0) * 10) / 10;
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
      confidence: Math.max(0, Math.min(1, conf)),
      region: raw?.region ?? { x: 100, y: 100, width: 200, height: 200 },
      nutrition: {
        calories: Math.round(Number(raw?.calories ?? 0)),
        protein: round1(Number(raw?.protein ?? 0)),
        carbs: round1(Number(raw?.carbs ?? 0)),
        fat: round1(Number(raw?.fat ?? 0)),
        fiber: round1(Number(raw?.fiber ?? 0)),
        sugar: round1(Number(raw?.sugar ?? 0)),
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

// ---------------- Providers ----------------
async function analyzeWithGemini(params: {
  image: string; // data URL
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

  const m = params.image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!m) {
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
You are a nutrition analysis assistant. Return ONLY JSON with this shape:

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

- Prefer Indian dish names when applicable.
- If unsure, keep confidence <= 0.6.
- If multiple items are present, assign stable itemId (1..N).
- Do not include any non-JSON text.
`.trim();

  const userPrompt = params.userContext?.prompt
    ? `User context: ${String(params.userContext.prompt)}`
    : 'No extra user context.';

  const parts = [
    { text: systemPrompt + '\n' + userPrompt },
    { inlineData: { mimeType, data } },
  ];

  try {
    const json: any = await runGeminiJSON(parts);
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
      confidence: Math.max(0, Math.min(1, conf)),
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

async function analyzeWithVisionOnly(params: {
  image: string; // data URL
  userContext?: Record<string, any>;
  referenceObject?: Record<string, any>;
  userId?: string;
}): Promise<AIAnalysisResult> {
  const started = Date.now();

  // Conservative default; IFCT + DB enrichment will refine later.
  const item: DetectedFoodItem = {
    itemId: 1,
    name: 'meal',
    confidence: 0.5,
    region: { x: 100, y: 100, width: 200, height: 200 },
    nutrition: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
    },
    alternatives: [],
    portionSize: {
      estimatedGrams: 150,
      confidenceRange: { min: 128, max: 173 },
      servingSizeCategory: 'medium',
    },
    cookingMethod: 'boiled',
    ingredients: [],
  };

  return {
    provider: 'vision',
    detectedItems: [item],
    confidence: 0.5,
    processingTimeMs: Date.now() - started,
  };
}

// ---------------- Orchestration ----------------
export const aiAnalysisService = {
  async multiModelAnalysis(params: {
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
    return ok.length
      ? ok
      : [
          {
            provider: 'vision',
            detectedItems: [],
            confidence: 0.5,
            processingTimeMs: 0,
          },
        ];
  },

  combineAnalysisResults(analyses: AIAnalysisResult[]): AIAnalysisResult {
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
        confidence: Math.max(0, Math.min(1, avgConf)),
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
      confidence: Math.max(0, Math.min(1, avg)),
      processingTimeMs: Math.max(...analyses.map((a) => a.processingTimeMs)),
      rawResponse: analyses,
    };
  },
};
