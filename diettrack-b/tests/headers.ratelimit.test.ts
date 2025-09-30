// tests/headers.ratelimit.test.ts

jest.mock('@/database/supabase', () => ({
  getSupabase: () => ({
    from: () => ({
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

describe('Rate-limit headers', () => {
  it('analysis route returns RateLimit headers', async () => {
    const res = await request(app)
      .post('/api/v1/analysis/analyze')
      .send({ userContext: { prompt: '1 katori rice' } });

    // express-rate-limit with standardHeaders: true
    const h = res.headers;
    expect(h['ratelimit-limit']).toBeDefined();
    expect(h['ratelimit-remaining']).toBeDefined();
    expect(h['ratelimit-reset']).toBeDefined();
  });
});
