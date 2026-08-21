import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('API Health Check', () => {
  it('GET /api/health should return 200 OK with service details', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'RecoverAI Backend API');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('GET /api/nonexistent-route should return 404 Not Found', async () => {
    const response = await request(app).get('/api/nonexistent-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
