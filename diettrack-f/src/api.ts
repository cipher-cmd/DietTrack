// src/lib/api.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function normalize(url: string) {
  return url.replace(/\/+$/, '');
}

function resolveBase(): string {
  // Prefer explicit env
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return normalize(envUrl);

  // Otherwise try to infer host from Expo
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any)?.manifest?.debuggerHost ||
    '';
  const host = hostUri.split(':')[0];

  if (host) return `http://${host}:4000`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
}

const BASE = resolveBase(); // e.g. http://192.168.29.7:4000
const API = `${BASE}/api/v1`; // API root

async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Bad JSON from ${res.url} (status ${res.status}): ${text.slice(0, 200)}`
    );
  }
}

export type AnalyzeResponse = {
  success: boolean;
  data?: {
    analysisId: string;
    detectedItems: any[];
    nutritionSummary?: {
      total_calories: number;
      total_protein: number;
      total_carbs: number;
      total_fat: number;
    };
  };
  error?: string;
  code?: string;
};

export async function analyze({
  imageBase64,
  prompt,
  userId = 'u_demo',
}: {
  imageBase64?: string;
  prompt?: string;
  userId?: string;
}): Promise<AnalyzeResponse> {
  const body: any = { userId, userContext: {} as any };
  if (imageBase64) body.image = imageBase64;
  if (prompt) body.userContext.prompt = prompt;

  const res = await fetch(`${API}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(
      `Analyze failed (${res.status}): ${msg.slice(0, 200)} → ${API}/analysis`
    );
  }
  return asJson<AnalyzeResponse>(res);
}

export async function saveAdjusted({
  id,
  adjustedItems,
  ingredientAddOns,
}: {
  id: string;
  adjustedItems: Array<{
    itemId: number;
    portionSize: { estimatedGrams: number };
  }>;
  ingredientAddOns?: Array<{
    name?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>;
}) {
  const res = await fetch(`${API}/analysis/${id}/adjusted`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adjustedItems,
      ingredientAddOns: ingredientAddOns || [],
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(
      `Save failed (${res.status}): ${msg.slice(0, 200)} → ${API}/analysis/${id}/adjusted`
    );
  }
  return asJson<any>(res);
}

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

export async function lookupIngredient(
  name: string,
  limit = 8
): Promise<IngredientMatch[]> {
  const url = `${API}/ingredients/lookup?name=${encodeURIComponent(
    name
  )}&limit=${limit}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Lookup failed (${res.status}): ${msg.slice(0, 200)}`);
  }
  const json = await asJson<{
    success: boolean;
    data?: { matches: IngredientMatch[] };
  }>(res);
  return json?.data?.matches || [];
}
