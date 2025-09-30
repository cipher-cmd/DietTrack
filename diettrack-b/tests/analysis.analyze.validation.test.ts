// Mocks that must load before the app
jest.mock('@/database/supabase', () => ({
  getSupabase: () => ({
    from: () => ({
      insert: async () => ({ error: null }),
      select: () => ({ limit: () => ({ data: [], error: null }) }),
    }),
    rpc: async () => ({ data: [], error: null }),
  }),
}));

jest.mock('@/services/aiAnalysis', () => ({
  analyzeImage: jest.fn().mockResolvedValue({
    detectedItems: [],
    overallConfidence: 0.5,
    provider: 'gemini',
    processingTimeMs: 5,
    raw: {},
  }),
}));

jest.mock('@/services/ifctService', () => ({
  getIFCTFoodByName: jest.fn().mockResolvedValue(null),
  enrichWithIFCTData: jest.fn().mockResolvedValue([]),
}));

import request from 'supertest';
import app from '@/server';

describe('Analyze validation', () => {
  it('rejects when neither image nor prompt is provided', async () => {
    const res = await request(app).post('/api/v1/analysis/analyze').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // middleware maps this specific message to MISSING_INPUT
    expect(res.body.code).toBe('MISSING_INPUT');
  });
});
