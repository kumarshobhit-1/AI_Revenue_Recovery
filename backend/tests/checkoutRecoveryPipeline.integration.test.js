import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { Payment } from '../src/models/Payment.js';
import { PaymentEvent } from '../src/models/PaymentEvent.js';
import { RecoveryCase } from '../src/models/RecoveryCase.js';
import { AIDecision } from '../src/models/AIDecision.js';
import { PolicyResult } from '../src/models/PolicyResult.js';
import { AuditLog } from '../src/models/AuditLog.js';

describe('Phase 2F — Closed-Loop Checkout Payment Recovery E2E Integration Suite', () => {
  let createdPaymentId = null;
  let createdCaseId = null;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recoverai';
    await connectDB(uri);
  });

  afterAll(async () => {
    if (createdPaymentId) {
      await Payment.deleteMany({ paymentId: createdPaymentId });
      await PaymentEvent.deleteMany({ paymentId: createdPaymentId });
    }
    if (createdCaseId) {
      await RecoveryCase.deleteMany({ caseId: createdCaseId });
      await AIDecision.deleteMany({ caseId: createdCaseId });
      await PolicyResult.deleteMany({ caseId: createdCaseId });
      await AuditLog.deleteMany({ caseId: createdCaseId });
    }
    await disconnectDB();
  });

  it('1. Checkout Payment Failure -> Closed-Loop Pipeline Execution -> Action Scheduled', async () => {
    const payload = {
      customerId: `cust_e2e_${Date.now()}`,
      customerName: 'E2E Validation User',
      customerEmail: 'e2e.user@example.com',
      amount: 9999,
      currency: 'INR',
      paymentMethod: 'NETBANKING',
      merchantId: 'mer_default',
      simulateResult: 'FAILED',
      simulateErrorCode: 'BANK_TIMEOUT',
    };

    const res = await request(app)
      .post('/api/payments/attempt')
      .set('Origin', 'http://localhost:3001')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment).toBeDefined();
    expect(res.body.data.payment.status).toBe('FAILED');
    expect(res.body.data.recoveryTriggered).toBe(true);

    createdPaymentId = res.body.data.payment.paymentId;
    createdCaseId = res.body.data.recoveryCase.caseId;

    // Single Payment Document Guarantee
    const paymentsInDb = await Payment.find({ paymentId: createdPaymentId });
    expect(paymentsInDb.length).toBe(1);
    expect(paymentsInDb[0].paymentId).toBe(createdPaymentId);

    // Verify Recovery Case link
    const caseInDb = await RecoveryCase.findOne({ caseId: createdCaseId });
    expect(caseInDb).not.toBeNull();
    expect(caseInDb.paymentId).toBe(createdPaymentId);
    expect(caseInDb.state).toBe('ACTION_SCHEDULED');
  });

  it('2. GET /api/events/cases/:caseId - should return enriched case details with Payment, AI Decision & Policy Result', async () => {
    expect(createdCaseId).not.toBeNull();

    const res = await request(app).get(`/api/events/cases/${createdCaseId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recoveryCase).toBeDefined();
    expect(res.body.data.payment).toBeDefined();
    expect(res.body.data.aiDecision).toBeDefined();
    expect(res.body.data.policyResult).toBeDefined();
    expect(Array.isArray(res.body.data.auditLogs)).toBe(true);

    expect(res.body.data.payment.paymentId).toBe(createdPaymentId);
    expect(res.body.data.aiDecision.caseId).toBe(createdCaseId);
    expect(res.body.data.policyResult.status).toBe('APPROVED');
  });

  it('3. POST /api/events/cases/:caseId/resolve - should resolve outcome and update metrics', async () => {
    expect(createdCaseId).not.toBeNull();

    const res = await request(app)
      .post(`/api/events/cases/${createdCaseId}/resolve`)
      .send({ outcome: 'SUCCESS', notes: 'E2E verification payment recovered' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.outcome).toBe('SUCCESS');

    // Verify Payment status updated to RECOVERED
    const updatedPayment = await Payment.findOne({ paymentId: createdPaymentId });
    expect(updatedPayment.status).toBe('RECOVERED');

    // Verify Metrics endpoint reflects recovery
    const metricsRes = await request(app).get('/api/events/metrics?merchantId=mer_default');
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.data.totalCases).toBeGreaterThan(0);
  });

  it('4. POST /api/payments/attempt - should enforce Zod schema validation (invalid email)', async () => {
    const res = await request(app)
      .post('/api/payments/attempt')
      .send({
        amount: 5000,
        customerEmail: 'not-an-email',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
