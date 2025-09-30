// Supabase + AI mocks (same pattern as above)
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
    processingTimeMs: 2,
    raw: {},
  }),
}));

jest.mock('@/services/ifctService', () => ({
  getIFCTFoodByName: jest.fn().mockResolvedValue(null),
  enrichWithIFCTData: jest.fn().mockResolvedValue([]),
}));

import request from 'supertest';
import app from '@/server';

describe('Analyze rate-limit', () => {
  it('11th request should be 429 with RATE_LIMIT_ANALYSIS', async () => {
    let last = 200;
    for (let i = 0; i < 11; i++) {
      const res = await request(app)
        .post('/api/v1/analysis/analyze')
        .send({ userContext: { prompt: 'rice' } });
      last = res.status;
      if (i === 10) {
        expect(res.status).toBe(429);
        expect(res.body.code).toBe('RATE_LIMIT_ANALYSIS');
      }
    }
    expect(last).toBe(429);
  });
});
