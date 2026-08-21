import { describe, it, expect } from 'vitest';
import { dbService } from '../src/services/dbService.js';
import {
  Merchant,
  Customer,
  PaymentEvent,
  RecoveryCase,
  AIDecision,
  PolicyResult,
  Notification,
  AuditLog,
} from '../src/models/index.js';

describe('Database Layer & Models Unit Tests', () => {
  it('should expose all essential dbService repository methods', () => {
    expect(typeof dbService.findOrCreateMerchant).toBe('function');
    expect(typeof dbService.findOrCreateCustomer).toBe('function');
    expect(typeof dbService.createPaymentEvent).toBe('function');
    expect(typeof dbService.createRecoveryCase).toBe('function');
    expect(typeof dbService.getRecoveryCaseById).toBe('function');
    expect(typeof dbService.getRecoveryCaseByPaymentId).toBe('function');
    expect(typeof dbService.updateCaseState).toBe('function');
    expect(typeof dbService.saveAIDecision).toBe('function');
    expect(typeof dbService.savePolicyResult).toBe('function');
    expect(typeof dbService.createNotification).toBe('function');
    expect(typeof dbService.appendAuditLog).toBe('function');
  });

  it('should correctly instantiate Mongoose models with defaults', () => {
    const merchant = new Merchant({
      merchantId: 'mer_001',
      name: 'Store 1',
      email: 'store1@example.com',
      apiKey: 'key_abc',
    });
    expect(merchant.policyLimits.maxRetries).toBe(3);

    const customer = new Customer({
      customerId: 'cust_001',
      merchantId: 'mer_001',
    });
    expect(customer.isOptedOut).toBe(false);
    expect(customer.ltv).toBe(0);

    const recCase = new RecoveryCase({
      caseId: 'case_001',
      paymentId: 'pay_001',
      customerId: 'cust_001',
      merchantId: 'mer_001',
      amount: 5000,
      revenueAtRisk: 5000,
    });
    expect(recCase.state).toBe('DETECTED');
    expect(recCase.recoveredAmount).toBe(0);

    const notif = new Notification({
      notificationId: 'notif_001',
      caseId: 'case_001',
      customerId: 'cust_001',
      channel: 'SMS',
      messageBody: 'Payment retry notice',
    });
    expect(notif.status).toBe('QUEUED');
  });
});
