import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { sanitizePayload } from '../src/middleware/sanitize.js';

describe('Phase 14 — Hardening & Security Audit Suite', () => {
  it('1. sanitizePayload - should mask sensitive payment credentials', () => {
    const rawPayload = {
      paymentId: 'pay_123',
      cardNumber: '4111111111111234',
      cvv: '123',
      upiPin: '9876',
      amount: 4999,
    };

    const sanitized = sanitizePayload(rawPayload);

    expect(sanitized.paymentId).toBe('pay_123');
    expect(sanitized.cardNumber).toBe('****1234');
    expect(sanitized.cvv).toBe('****');
    expect(sanitized.upiPin).toBe('****');
    expect(sanitized.amount).toBe(4999);
  });

  it('2. CORS Headers - should allow valid origin http://localhost:3000', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('3. Health & Auth Protection - should expose hardened API health endpoint', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('RecoverAI Backend API');
  });
});
