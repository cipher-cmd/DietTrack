// tests/smoke.test.ts

// --- Mocks that must run BEFORE importing the app ---

// Mock Supabase so no real network is done during tests
// tests/smoke.test.ts
jest.mock('uuid', () => ({ v4: () => '00000000-0000-0000-0000-000000000000' }));

jest.mock('@/database/supabase', () => ({
  getSupabase: () => ({
    from: () => ({
      // used by analyzeFood insert; return successful no-op
      insert: async () => ({ error: null }),
      // used by /ready in some contexts; safe no-ops if reached
      select: () => ({ limit: () => ({ data: [], error: null }) }),
    }),
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
}));

// AI services are mocked globally in setup.ts

// --- Now import the app ---
import request from 'supertest';
import app from '@/server';

describe('API smoke tests', () => {
  it('GET /health returns OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('GET /api/v1 returns index', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.endpoints).toBeDefined();
  });

  it('POST /api/v1/analysis/analyze (prompt-only) succeeds', async () => {
    const res = await request(app)
      .post('/api/v1/analysis/analyze')
      .send({ userContext: { prompt: '1 bowl rice and dal' } });
    
    if (res.status !== 200) {
      console.log('Error response:', res.body);
    }
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.detectedItems)).toBe(true);
  });
});
