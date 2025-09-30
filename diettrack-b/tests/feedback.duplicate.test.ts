import request from 'supertest';
import app from '@/server';
import { randomUUID } from 'crypto';

describe('Feedback concurrency', () => {
  it('only one of two concurrent identical submissions succeeds', async () => {
    // Fresh analysisId every run to avoid accidental cross-test collisions
    const analysisId = randomUUID();

    const payload = {
      analysisId,
      userId: 'user-concurrent',
      helpful: true,
      comment: 'race test',
    };

    // Fire both requests at the same time
    const [r1, r2] = await Promise.all([
      request(app).post('/api/v1/feedback').send(payload),
      request(app).post('/api/v1/feedback').send(payload),
    ]);

    const statuses = [r1.status, r2.status].sort();

    // Expect one success (200 or 201) and one duplicate (409)
    const ok = statuses.some((s) => s === 200 || s === 201);
    const dup = statuses.some((s) => s === 409);

    expect(ok).toBe(true);
    expect(dup).toBe(true);
  });
});
