// src/ingredientLibrary.ts
// Approximate macros for common Indian household add-ons.
// All values are per "unit" shown in the label.

export type IngredientDef = {
  key: string;
  label: string; // e.g. "Oil (tbsp)"
  unit?: string; // tsp|tbsp|100g|50g etc (purely for display)
  nutrition: {
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
};

export const INGREDIENTS: IngredientDef[] = [
  {
    key: 'oil_tbsp',
    label: 'Oil (tbsp)',
    unit: 'tbsp',
    nutrition: { calories: 120, fat: 13.5 },
  },
  {
    key: 'ghee_tsp',
    label: 'Ghee (tsp)',
    unit: 'tsp',
    nutrition: { calories: 45, fat: 5.0 },
  },
  {
    key: 'butter_tsp',
    label: 'Butter (tsp)',
    unit: 'tsp',
    nutrition: { calories: 34, fat: 3.9 },
  },
  {
    key: 'cream_tbsp',
    label: 'Cream (tbsp)',
    unit: 'tbsp',
    nutrition: { calories: 52, fat: 5.5, protein: 0.3, carbs: 0.4 },
  },
  {
    key: 'sugar_tsp',
    label: 'Sugar (tsp)',
    unit: 'tsp',
    nutrition: { calories: 16, carbs: 4 },
  },
  {
    key: 'jaggery_tsp',
    label: 'Jaggery (tsp)',
    unit: 'tsp',
    nutrition: { calories: 20, carbs: 5 },
  },
  {
    key: 'peanut_tbsp',
    label: 'Peanut (tbsp)',
    unit: 'tbsp',
    nutrition: { calories: 90, protein: 4, carbs: 3, fat: 7.9 },
  },
  {
    key: 'cashew_tbsp',
    label: 'Cashew (tbsp)',
    unit: 'tbsp',
    nutrition: { calories: 95, protein: 3.3, carbs: 4.9, fat: 7.9 },
  },
  {
    key: 'paneer_50g',
    label: 'Paneer (50g)',
    unit: '50g',
    nutrition: { calories: 145, protein: 9, carbs: 1.2, fat: 11 },
  },
  {
    key: 'curd_100g',
    label: 'Curd (100g)',
    unit: '100g',
    nutrition: { calories: 60, protein: 3.5, carbs: 4, fat: 3.5 },
  },
];
