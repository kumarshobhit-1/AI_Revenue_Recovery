import { describe, it, expect } from 'vitest';
import { Payment, PAYMENT_METHODS, PAYMENT_STATUSES } from '../src/models/Payment.js';
import { dbService } from '../src/services/dbService.js';

describe('Phase 1 — Payment Domain Model & Persistence Tests', () => {
  it('1. should create a valid Payment document', async () => {
    const paymentData = {
      paymentId: `pay_test_${Date.now()}`,
      merchantId: 'mer_default',
      customerId: `cust_test_${Date.now()}`,
      amount: 4999,
      currency: 'INR',
      paymentMethod: 'CARD',
      status: 'INITIATED',
    };

    const payment = await dbService.createPayment(paymentData);
    expect(payment).toBeDefined();
    expect(payment.paymentId).toBe(paymentData.paymentId);
    expect(payment.amount).toBe(4999);
    expect(payment.status).toBe('INITIATED');
  });

  it('2. should enforce required fields for Payment model schema', () => {
    const payment = new Payment({});
    const err = payment.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.paymentId).toBeDefined();
    expect(err.errors.merchantId).toBeDefined();
    expect(err.errors.customerId).toBeDefined();
    expect(err.errors.amount).toBeDefined();
  });

  it('3. should reject negative payment amounts (< 0)', () => {
    const payment = new Payment({
      paymentId: 'pay_neg_1',
      merchantId: 'mer_default',
      customerId: 'cust_1',
      amount: -500,
    });
    const err = payment.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.amount).toBeDefined();
  });

  it('4. should reject invalid payment methods (e.g. BITCOIN)', () => {
    const payment = new Payment({
      paymentId: 'pay_invalid_method',
      merchantId: 'mer_default',
      customerId: 'cust_1',
      amount: 1000,
      paymentMethod: 'BITCOIN',
    });
    const err = payment.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.paymentMethod).toBeDefined();
  });

  it('5. should support valid payment statuses (INITIATED, SUCCESS, FAILED, RETRY_PENDING, RECOVERED)', () => {
    PAYMENT_STATUSES.forEach((st) => {
      const payment = new Payment({
        paymentId: `pay_status_${st}`,
        merchantId: 'mer_default',
        customerId: 'cust_1',
        amount: 1000,
        status: st,
      });
      const err = payment.validateSync();
      expect(err).toBeUndefined();
    });
  });

  it('6. should reject duplicate paymentId creation', async () => {
    const paymentId = `pay_dup_${Date.now()}`;
    const paymentData = {
      paymentId,
      merchantId: 'mer_default',
      customerId: 'cust_1',
      amount: 2500,
    };

    await dbService.createPayment(paymentData);
    await expect(dbService.createPayment(paymentData)).rejects.toThrow();
  });

  it('7. should persist and retrieve payment by paymentId', async () => {
    const paymentId = `pay_retrieve_${Date.now()}`;
    await dbService.createPayment({
      paymentId,
      merchantId: 'mer_default',
      customerId: 'cust_retrieve',
      amount: 9999,
      paymentMethod: 'UPI',
      status: 'FAILED',
      errorCode: 'INSUFFICIENT_FUNDS',
    });

    const retrieved = await dbService.getPaymentById(paymentId);
    expect(retrieved).toBeDefined();
    expect(retrieved.paymentId).toBe(paymentId);
    expect(retrieved.paymentMethod).toBe('UPI');
    expect(retrieved.status).toBe('FAILED');
    expect(retrieved.errorCode).toBe('INSUFFICIENT_FUNDS');
  });

  it('8. should update payment status to RECOVERED or SUCCESS', async () => {
    const paymentId = `pay_update_${Date.now()}`;
    await dbService.createPayment({
      paymentId,
      merchantId: 'mer_default',
      customerId: 'cust_update',
      amount: 15000,
      status: 'FAILED',
    });

    const updated = await dbService.updatePaymentStatus(paymentId, 'RECOVERED', {
      gatewayResponse: { success: true, txnId: 'txn_123' },
    });

    expect(updated.status).toBe('RECOVERED');
    expect(updated.gatewayResponse.txnId).toBe('txn_123');
  });

  it('9. should list payments with status filters', async () => {
    const merchantId = `mer_list_${Date.now()}`;
    await dbService.createPayment({
      paymentId: `pay_l1_${Date.now()}`,
      merchantId,
      customerId: 'cust_1',
      amount: 1000,
      status: 'FAILED',
    });
    await dbService.createPayment({
      paymentId: `pay_l2_${Date.now()}`,
      merchantId,
      customerId: 'cust_2',
      amount: 2000,
      status: 'RECOVERED',
    });

    const failedPayments = await dbService.listPayments({ merchantId, status: 'FAILED' });
    expect(failedPayments.payments.length).toBe(1);
    expect(failedPayments.payments[0].status).toBe('FAILED');
  });
});
