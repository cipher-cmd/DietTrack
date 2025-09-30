// tests/photoUpload.route.test.ts

// Supabase storage mock (no real network)
jest.mock('@/database/supabase', () => ({
  getSupabase: () => ({
    storage: {
      from: () => ({
        upload: async (_path: string, _bin: any, _opts: any) => ({
          data: { path: 'photos/fake.png' },
          error: null,
        }),
        getPublicUrl: (_p: string) => ({
          data: { publicUrl: 'https://example.com/photos/fake.png' },
        }),
      }),
    },
    from: () => ({
      select: () => ({ limit: () => ({ data: [], error: null }) }),
    }),
    rpc: async () => ({ data: [], error: null }),
  }),
}));

// AI mocks (not used here, harmless)
jest.mock('@/services/aiAnalysis', () => ({
  analyzeImage: jest.fn().mockResolvedValue({
    detectedItems: [],
    overallConfidence: 0.4,
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

const VALID_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAAAAAA' +
  'A6fptVAAAACklEQVR42mP8/wwAAn8B9x+q0zIAAAAASUVORK5CYII=';

describe('Photo upload route', () => {
  it('400 when body is missing image', async () => {
    const res = await request(app).post('/api/v1/photo-upload').send({}); // no image

    // Your route likely validates and returns 400 on missing/invalid image
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('200 on valid data URL image', async () => {
    const res = await request(app)
      .post('/api/v1/photo-upload')
      .send({ image: VALID_DATA_URL });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    // depending on your route response shape:
    // expect(res.body.data?.publicUrl).toContain('https://example.com/photos/');
  });
});
