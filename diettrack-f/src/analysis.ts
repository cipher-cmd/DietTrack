// Shared types + helpers used by screens/components.

export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cholesterol?: number;
};

export type PortionSize = {
  estimatedGrams: number;
  confidenceRange?: { min: number; max: number };
  servingSizeCategory?: 'small' | 'medium' | 'large';
};

export type DetectedItem = {
  itemId: number;
  name: string;
  confidence: number;
  cookingMethod?: string;
  ingredients?: string[];
  portionSize: PortionSize;
  nutrition: Nutrition; // totals for *this serving*
  nutritionPer100g?: Nutrition; // optional – used for local rescaling
};

// ---------- Basic numeric helpers ----------
export function round1(n: number) {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}
export function kCal(n: number) {
  return `${Math.round(n || 0)} kcal`;
}
export function g(n: number | undefined) {
  if (typeof n !== 'number') return '0 g';
  return `${round1(n)} g`;
}

// Scale per-100g nutrition by grams
export function scalePer100g(
  per100: Nutrition | undefined,
  grams: number
): Nutrition {
  if (!per100) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const f = grams / 100;
  return {
    calories: Math.round((per100.calories || 0) * f),
    protein: round1((per100.protein || 0) * f),
    carbs: round1((per100.carbs || 0) * f),
    fat: round1((per100.fat || 0) * f),
    fiber: round1((per100.fiber || 0) * f),
    sugar: round1((per100.sugar || 0) * f),
    sodium: Math.round((per100.sodium || 0) * f),
    cholesterol: Math.round((per100.cholesterol || 0) * f),
  };
}

export type Totals = Nutrition;

export function sumTotals(items: Array<Nutrition>): Totals {
  return items.reduce<Totals>(
    (acc, n) => ({
      calories: acc.calories + (n.calories || 0),
      protein: round1(acc.protein + (n.protein || 0)),
      carbs: round1(acc.carbs + (n.carbs || 0)),
      fat: round1(acc.fat + (n.fat || 0)),
      fiber: round1((acc.fiber || 0) + (n.fiber || 0)),
      sugar: round1((acc.sugar || 0) + (n.sugar || 0)),
      sodium: (acc.sodium || 0) + (n.sodium || 0),
      cholesterol: (acc.cholesterol || 0) + (n.cholesterol || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// ---------- UI helpers your panel expects ----------
export function itemInfoRows(it: DetectedItem) {
  const grams = it.portionSize?.estimatedGrams ?? 0;
  const serving = it.portionSize?.servingSizeCategory;
  const per100 = it.nutritionPer100g;

  const rows = [
    {
      label: 'Portion',
      value: serving ? `${grams} g (${serving})` : `${grams} g`,
    },
    { label: 'Protein', value: g(it.nutrition.protein) },
    { label: 'Carbs', value: g(it.nutrition.carbs) },
    { label: 'Fat', value: g(it.nutrition.fat) },
  ];

  if (per100) {
    rows.push({
      label: 'Per 100 g',
      value:
        `${Math.round(per100.calories || 0)} kcal` +
        ` / P${round1(per100.protein || 0)} C${round1(per100.carbs || 0)} F${round1(per100.fat || 0)}`,
    });
  }

  return rows;
}
