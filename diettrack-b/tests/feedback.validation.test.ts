// tests/feedback.validation.test.ts

// 1) For this file, mock the controller so we test only validation success path
jest.mock('@/controllers/feedbackController', () => {
  // Minimal, deterministic handlers
  return {
    submitFeedback: (req: any, res: any) =>
      // If we reached here, validation passed. Return success.
      res.status(201).json({ success: true, data: { id: 'mock-feedback-id' } }),
    getFeedbackByAnalysisId: (_req: any, res: any) =>
      res.json({ success: true, data: [] }),
  };
});

// 2) We still want to be able to hit /ready, etc., without real network
jest.mock('@/database/supabase', () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({ limit: () => ({ data: [], error: null }) }),
      insert: async () => ({ error: null }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
    }),
    rpc: async () => ({ data: [], error: null }),
  }),
}));

import request from 'supertest';
import app from '@/server';

describe('Feedback validation', () => {
  it('rejects bad payload', async () => {
    const res = await request(app).post('/api/v1/feedback').send({
      analysisId: 'not-a-uuid',
      helpful: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_INPUT');
  });

  it('accepts minimal valid payload', async () => {
    const res = await request(app).post('/api/v1/feedback').send({
      analysisId: '22222222-2222-4222-8222-222222222222', // valid UUID
      userId: 'user-123',
      helpful: true,
    });
    // Controller is mocked to return success if validation passes
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.id).toBe('mock-feedback-id');
  });
});
