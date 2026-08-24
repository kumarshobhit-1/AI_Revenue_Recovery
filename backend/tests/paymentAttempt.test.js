import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { dbService } from '../src/services/dbService.js';
import { Payment } from '../src/models/Payment.js';

describe('Phase 2A — Payment Attempt API & Lifecycle Integration Tests', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recoverai';
    await connectDB(uri);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('1. POST /api/payments/attempt - should create a SUCCESS payment attempt', async () => {
    const payload = {
      customerId: `cust_succ_${Date.now()}`,
      customerName: 'Successful Tester',
      customerEmail: 'succ@example.com',
      amount: 5000,
      currency: 'INR',
      paymentMethod: 'CARD',
      simulateResult: 'SUCCESS',
    };

    const res = await request(app)
      .post('/api/payments/attempt')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment).toBeDefined();
    expect(res.body.data.payment.status).toBe('SUCCESS');
    expect(res.body.data.recoveryTriggered).toBe(false);

    // Verify MongoDB document
    const paymentInDb = await Payment.findOne({ paymentId: res.body.data.payment.paymentId });
    expect(paymentInDb).not.toBeNull();
    expect(paymentInDb.status).toBe('SUCCESS');

    // Clean up
    await Payment.deleteOne({ paymentId: res.body.data.payment.paymentId });
  });

  it('2. POST /api/payments/attempt - should create a FAILED payment attempt and trigger recovery pipeline', async () => {
    const payload = {
      customerId: `cust_fail_${Date.now()}`,
      customerName: 'Failed Tester',
      customerEmail: 'fail@example.com',
      amount: 14999,
      currency: 'INR',
      paymentMethod: 'UPI',
      simulateResult: 'FAILED',
      simulateErrorCode: 'INSUFFICIENT_FUNDS',
      simulateFailureReason: 'Customer account balance insufficient',
    };

    const res = await request(app)
      .post('/api/payments/attempt')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment).toBeDefined();
    expect(res.body.data.payment.status).toBe('FAILED');
    expect(res.body.data.recoveryTriggered).toBe(true);
    expect(res.body.data.recoveryCase).toBeDefined();

    const paymentId = res.body.data.payment.paymentId;

    // Verify single payment document guarantee in MongoDB
    const paymentsInDb = await Payment.find({ paymentId });
    expect(paymentsInDb.length).toBe(1);
    expect(paymentsInDb[0].status).toBe('FAILED');

    // Clean up
    await Payment.deleteOne({ paymentId });
  });

  it('3. GET /api/payments - should return paginated list of payments', async () => {
    const res = await request(app)
      .get('/api/payments')
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('4. POST /api/payments/attempt - should reject invalid payloads (negative amount)', async () => {
    const payload = {
      amount: -100,
      paymentMethod: 'CARD',
    };

    const res = await request(app)
      .post('/api/payments/attempt')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
