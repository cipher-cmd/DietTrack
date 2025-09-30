// tests/analysis.adjust.test.ts

// Ensure uuid.validate works in routes
jest.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
  // simple validator good enough for tests
  validate: (s: string) =>
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      String(s)
    ),
}));

// Supabase mock: implement select(...).eq(...).single() + update(...).eq(...)
jest.mock('@/database/supabase', () => {
  // A realistic base item saved by /analysis/analyze
  const baseDetectedItems = [
    {
      itemId: 1,
      name: 'rice',
      confidence: 0.7,
      region: { x: 100, y: 100, width: 200, height: 200 },
      nutrition: {
        calories: 200,
        protein: 4,
        carbs: 44,
        fat: 0.5,
        fiber: 0.5,
        sugar: 0,
        sodium: 5,
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
      // some logic reads this; include a basic snapshot
      nutritionPer100g: {
        calories: Math.round((200 * 100) / 150),
        protein: Math.round((4 * 10) / 15) / 10,
        carbs: Math.round((44 * 10) / 15) / 10,
        fat: Math.round((0.5 * 10) / 15) / 10,
        fiber: Math.round((0.5 * 10) / 15) / 10,
        sugar: 0,
        sodium: Math.round((5 * 100) / 150),
        cholesterol: 0,
      },
    },
  ];

  const selectChain = {
    eq: (_col: string, _val: any) => ({
      single: async () => ({
        data: { detected_items: baseDetectedItems, user_id: 'user-123' },
        error: null,
      }),
    }),
    limit: (_n: number) => ({ data: [], error: null }),
  };

  const updateChain = {
    eq: (_col: string, _val: any) => ({ error: null }),
  };

  return {
    getSupabase: () => ({
      from: (table: string) => {
        if (table === 'food_analyses') {
          return {
            select: () => selectChain,
            update: () => updateChain,
          };
        }
        // safe default
        return {
          select: () => selectChain,
          update: () => updateChain,
          insert: async () => ({ error: null }),
        };
      },
    }),
  };
});

import request from 'supertest';
import app from '@/server';

describe('Adjusted analysis', () => {
  it('scales portion grams and adds add-ons', async () => {
    const analysisId = '11111111-1111-4111-8111-111111111111';

    const payload = {
      adjustedItems: [
        {
          itemId: 1,
          portionSize: { estimatedGrams: 200 }, // scale from 150g → 200g
        },
      ],
      ingredientAddOns: [
        // use ghee 10g so preset kicks in (90 kcal, fat ~10g)
        { name: 'ghee', grams: 10 },
      ],
      userId: 'user-123',
    };

    const res = await request(app)
      .post(`/api/v1/analysis/${analysisId}/adjusted`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const totals = res.body.data.nutritionSummary;
    // base item scaled 150g → 200g: calories ~ 200 * (200/150) = ~267 + 90 from ghee ≈ 357
    expect(totals.total_calories).toBeGreaterThan(330);
    expect(totals.total_protein).toBeGreaterThan(5); // 4 * (200/150) ~ 5.3
    expect(totals.total_carbs).toBeGreaterThan(55); // 44 * (200/150) ~ 58.7
    expect(totals.total_fat).toBeGreaterThan(10); // base fat scaled + ~10g from ghee
  });
});
