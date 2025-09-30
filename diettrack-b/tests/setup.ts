// tests/setup.ts
// Global Jest setup for backend tests: stable env + deterministic, concurrency-safe mocks.

process.env.NODE_ENV = 'test';

// Satisfy server startup env checks during tests (values don't matter because we mock)
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost/dummy';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';
process.env.AI_STRATEGY = process.env.AI_STRATEGY || 'gemini_only';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'dummy';

// 1) Mock 'uuid' to avoid any ESM resolver weirdness in Jest
jest.mock('uuid', () => ({
  v4: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  validate: (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s
    ),
}));

// 2) Shared in-memory state for our Supabase mock
const globalAny = global as any;
if (!globalAny.__supabaseMockState) {
  globalAny.__supabaseMockState = { seen: new Set<string>() };
}
// This reset function will be called by Jest before each test
globalAny.__supabaseMockReset = () => {
  globalAny.__supabaseMockState.seen.clear();
};

// 3) Mock Supabase globally. This mock will be used by ALL tests.
jest.mock('@/database/supabase', () => {
  const state = (global as any).__supabaseMockState;

  const duplicateError = {
    status: 409,
    code: '23505',
    message: 'duplicate key value violates unique constraint',
  };

  const successResponse = (data: any) => ({
    select: (_?: string) => ({
      single: async () => ({ data, error: null }),
    }),
  });

  const duplicateResponse = () => ({
    select: (_?: string) => ({
      single: async () => ({ data: null, error: duplicateError }),
    }),
  });

  return {
    getSupabase: () => ({
      from: (table: string) => {
        const tableName = (table || '').toLowerCase();

        // Mock for feedback table (handles duplicates)
        if (tableName.includes('feedback')) {
          return {
            insert: (row: any) => {
              const key = `${row?.analysis_id ?? ''}::${row?.user_id ?? ''}`;
              if (state.seen.has(key)) {
                return duplicateResponse();
              }
              state.seen.add(key);
              return successResponse({ id: row?.id ?? 'fake-id' });
            },
            select: (_cols: string) => ({
              eq: (_col: string, _val: any) => ({
                limit: (_n: number) =>
                  Promise.resolve({ data: [], error: null }),
              }),
            }),
          };
        }

        // Mock for meal_logs table
        if (tableName.includes('meal_logs')) {
          return {
            insert: (rows: any) => {
              const row = Array.isArray(rows) ? rows[0] : rows;
              return {
                select: (columns?: string) => ({
                  single: async () => ({
                    data: {
                      id: 'fake-meal-log-id',
                      logged_at: new Date().toISOString(),
                      user_id: row?.user_id || 'test-user',
                      analysis_id: row?.analysis_id || 'fake-analysis-id',
                      ...row
                    },
                    error: null
                  })
                })
              };
            },
            select: () => ({
              limit: () => ({ data: [], error: null }),
              eq: () => ({
                single: async () => ({
                  data: { id: 'fake-analysis' },
                  error: null,
                }),
              }),
            }),
            update: () => ({ eq: () => ({ error: null }) }),
          };
        }

        // Default mocks for other tables
        return {
          insert: (row: any) => successResponse(row),
          select: () => ({
            limit: () => ({ data: [], error: null }),
            eq: () => ({
              single: async () => ({
                data: { id: 'fake-analysis' },
                error: null,
              }),
            }),
          }),
          update: () => ({ eq: () => ({ error: null }) }),
        };
      },
      rpc: async () => ({ data: [], error: null }),
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          getPublicUrl: () => ({
            data: { publicUrl: 'http://example.com/fake.jpg' },
          }),
        }),
      },
    }),
  };
});

// Mock AI Analysis service globally
jest.mock('@/services/aiAnalysis', () => ({
  analyzeImage: jest.fn().mockResolvedValue({
    detectedItems: [
      {
        itemId: 1,
        name: 'rice',
        confidence: 0.9,
        portionSize: {
          estimatedGrams: 150,
          confidenceRange: [100, 200],
          servingSizeCategory: 'medium'
        },
        nutrition: {
          calories: 200,
          protein: 4,
          carbs: 45,
          fat: 0.5,
          fiber: 0.6,
          sugar: 0.1,
          sodium: 1,
          cholesterol: 0
        },
        nutritionPer100g: {
          calories: 130,
          protein: 2.7,
          carbs: 28,
          fat: 0.3,
          fiber: 0.4,
          sugar: 0.1,
          sodium: 1,
          cholesterol: 0
        }
      }
    ],
    overallConfidence: 0.9,
    provider: 'gemini',
    processingTimeMs: 100,
    raw: {}
  })
}));

// Mock IFCT service globally
jest.mock('@/services/ifctService', () => ({
  getIFCTFoodByName: jest.fn().mockResolvedValue({
    ingredient_id: 'test_id',
    name: 'rice',
    serving_size_g: 150,
    calories_per_100g: 130,
    protein_per_100g: 2.7,
    carbs_per_100g: 28,
    fat_per_100g: 0.3
  }),
  enrichWithIFCTData: jest.fn().mockImplementation((items) => Promise.resolve(items))
}));

// Always start with a clean mock state before each test
beforeEach(() => {
  (global as any).__supabaseMockReset?.();
});
