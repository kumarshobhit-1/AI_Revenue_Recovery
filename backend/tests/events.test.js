import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { canTransition, validateTransition, StateTransitionError } from '../src/engine/stateMachine.js';

describe('Phase 5 — Payment Event Ingestion & State Machine Tests', () => {
  describe('State Machine Unit Tests', () => {
    it('should allow valid transitions', () => {
      expect(canTransition('DETECTED', 'ANALYZING')).toBe(true);
      expect(canTransition('ANALYZING', 'ELIGIBLE')).toBe(true);
      expect(canTransition('ELIGIBLE', 'ACTION_PLANNED')).toBe(true);
      expect(canTransition('ACTION_EXECUTED', 'RECOVERED')).toBe(true);
      expect(canTransition('ACTION_EXECUTED', 'FAILED')).toBe(true);
    });

    it('should reject illegal state jumps', () => {
      expect(canTransition('DETECTED', 'RECOVERED')).toBe(false);
      expect(canTransition('DETECTED', 'ACTION_EXECUTED')).toBe(false);
      expect(canTransition('RECOVERED', 'ANALYZING')).toBe(false);
    });

    it('should throw StateTransitionError on invalid transition execution', () => {
      expect(() => validateTransition('DETECTED', 'RECOVERED', 'case_test_99')).toThrow(StateTransitionError);
    });
  });

  describe('Event Routes API Integration Tests (Mock DB / Memory)', () => {
    const testIdempotencyKey = `idemp_test_${Date.now()}`;

    it('POST /api/events/simulate should ingest synthetic payment failure event', async () => {
      const response = await request(app)
        .post('/api/events/simulate')
        .send({
          paymentId: `pay_test_${Date.now()}`,
          amount: 4999,
          failureReason: 'INSUFFICIENT_FUNDS',
          idempotencyKey: testIdempotencyKey,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('caseId');
      expect(response.body.data).toHaveProperty('eventId');
      expect(response.body.data.state).toBe('ELIGIBLE');
      expect(response.body.data.revenueAtRisk).toBeGreaterThan(0);
    });

    it('POST /api/events/simulate with duplicate idempotency key should return 200 OK with duplicated: true', async () => {
      const response = await request(app)
        .post('/api/events/simulate')
        .send({
          paymentId: `pay_duplicate_test`,
          amount: 4999,
          failureReason: 'INSUFFICIENT_FUNDS',
          idempotencyKey: testIdempotencyKey, // Re-using same idempotency key
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.duplicated).toBe(true);
      expect(response.body.message).toContain('already ingested');
    });

    it('GET /api/events/cases should return list of cases', async () => {
      const response = await request(app).get('/api/events/cases');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cases');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('GET /api/events/cases/:caseId should return 404 for unknown case', async () => {
      const response = await request(app).get('/api/events/cases/case_nonexistent_999');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
