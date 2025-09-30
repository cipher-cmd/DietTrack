import request from 'supertest';
import app from '@/server';
import { randomUUID } from 'crypto';

// Also reset here, just to be extra safe if this file is run alone
beforeEach(() => {
  (global as any).__supabaseMockReset?.();
});

describe('Feedback concurrency', () => {
  it('only one of two concurrent identical submissions succeeds', async () => {
    const analysisId = randomUUID();

    const payload = {
      analysisId,
      userId: 'user-concurrent',
      helpful: true,
      comment: 'race test',
    };

    // Fire both at the same time
    const [r1, r2] = await Promise.all([
      request(app).post('/api/v1/feedback').send(payload),
      request(app).post('/api/v1/feedback').send(payload),
    ]);

    const statuses = [r1.status, r2.status];

    // Expect exactly one success (200/201) and one conflict (409)
    const okCount = statuses.filter((s) => s === 200 || s === 201).length;
    const dupCount = statuses.filter((s) => s === 409).length;

    expect(okCount).toBe(1);
    expect(dupCount).toBe(1);
  });
});
