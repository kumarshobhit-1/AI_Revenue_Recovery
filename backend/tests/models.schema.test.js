import { describe, it, expect } from 'vitest';
import {
  Merchant,
  Customer,
  PaymentEvent,
  RecoveryCase,
  AIDecision,
  PolicyResult,
  Notification,
  AuditLog,
  RECOVERY_CASE_STATES,
} from '../src/models/index.js';

describe('Mongoose Schemas Unit Tests (Synchronous Validation)', () => {
  it('should validate valid Merchant document', () => {
    const doc = new Merchant({
      merchantId: 'mer_100',
      name: 'Test Merchant',
      email: 'merchant@test.com',
      apiKey: 'key_123',
    });

    const err = doc.validateSync();
    expect(err).toBeUndefined();
    expect(doc.policyLimits.maxRetries).toBe(3);
  });

  it('should reject Merchant missing required email', () => {
    const doc = new Merchant({
      merchantId: 'mer_100',
      name: 'Test Merchant',
      apiKey: 'key_123',
    });

    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.email).toBeDefined();
  });

  it('should validate RecoveryCase state enum values', () => {
    RECOVERY_CASE_STATES.forEach((state) => {
      const doc = new RecoveryCase({
        caseId: `case_${state}`,
        paymentId: 'pay_1',
        customerId: 'cust_1',
        merchantId: 'mer_1',
        amount: 1000,
        revenueAtRisk: 1000,
        state,
      });

      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });
  });

  it('should reject invalid RecoveryCase state value', () => {
    const doc = new RecoveryCase({
      caseId: 'case_invalid',
      paymentId: 'pay_1',
      customerId: 'cust_1',
      merchantId: 'mer_1',
      amount: 1000,
      revenueAtRisk: 1000,
      state: 'FORBIDDEN_STATE',
    });

    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.state).toBeDefined();
  });

  it('should validate Notification channel and status enums', () => {
    const validNotif = new Notification({
      notificationId: 'notif_1',
      caseId: 'case_1',
      customerId: 'cust_1',
      channel: 'WHATSAPP',
      status: 'SENT',
      messageBody: 'Your payment retry is scheduled.',
    });

    const err = validNotif.validateSync();
    expect(err).toBeUndefined();
  });
});
