import request from 'supertest';
import app from '@/server';

describe('Debug routes', () => {
  it('POST /debug/validate-image marks a valid data URL', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    const res = await request(app)
      .post('/api/v1/debug/validate-image')
      .send({ image: png });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.mime).toBe('image/png');
  });

  it('POST /debug/validate-image handles invalid input', async () => {
    const res = await request(app)
      .post('/api/v1/debug/validate-image')
      .send({ image: 'not-a-data-url' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.valid).toBe(false);
  });
});
