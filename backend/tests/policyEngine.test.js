import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../src/engine/policyEngine.js';
import { policyService } from '../src/services/policyService.js';
import { dbService } from '../src/services/dbService.js';

describe('Phase 9 — Policy Engine & Guardrails Tests', () => {
  describe('Policy Guardrail Rules Unit Tests', () => {
    it('Rule 1: Should reject retries when payment is already recovered', () => {
      const verdict = evaluatePolicy(
        {
          caseData: { amount: 5000, retryCount: 0, recoveredAmount: 5000, state: 'RECOVERED' },
          customer: { isOptedOut: false },
          merchantLimits: { maxRetries: 3 },
        },
        { recommendedAction: 'SCHEDULE_RETRY', confidenceScore: 0.90, suggestedDelayMinutes: 360 }
      );

      expect(verdict.status).toBe('REJECTED');
      expect(verdict.finalAction).toBe('STOP_WORKFLOW');
      expect(verdict.violatedRules).toContain('PAYMENT_ALREADY_RECOVERED');
    });

    it('Rule 2: Should reject action when customer is opted out', () => {
      const verdict = evaluatePolicy(
        {
          caseData: { amount: 2500, retryCount: 0, recoveredAmount: 0 },
          customer: { isOptedOut: true },
          merchantLimits: { maxRetries: 3 },
        },
        { recommendedAction: 'SEND_NOTIFICATION', confidenceScore: 0.85, suggestedDelayMinutes: 0 }
      );

      expect(verdict.status).toBe('REJECTED');
      expect(verdict.finalAction).toBe('STOP_WORKFLOW');
      expect(verdict.violatedRules).toContain('CUSTOMER_OPTED_OUT');
    });

    it('Rule 3: Should reject retry when max retry limit reached (retryCount >= 3)', () => {
      const verdict = evaluatePolicy(
        {
          caseData: { amount: 4999, retryCount: 3, recoveredAmount: 0 },
          customer: { isOptedOut: false },
          merchantLimits: { maxRetries: 3 },
        },
        { recommendedAction: 'SCHEDULE_RETRY', confidenceScore: 0.88, suggestedDelayMinutes: 360 }
      );

      expect(verdict.status).toBe('REJECTED');
      expect(verdict.finalAction).toBe('STOP_WORKFLOW');
      expect(verdict.violatedRules).toContain('MAX_RETRIES_EXCEEDED');
    });

    it('Rule 4: Should override action to ESCALATE_TO_MERCHANT for high value (> 50,000) and low AI confidence (< 0.75)', () => {
      const verdict = evaluatePolicy(
        {
          caseData: { amount: 75000, currency: 'INR', retryCount: 0, recoveredAmount: 0 },
          customer: { isOptedOut: false },
          merchantLimits: { highValueThresholdAmount: 50000 },
        },
        { recommendedAction: 'SCHEDULE_RETRY', confidenceScore: 0.60, suggestedDelayMinutes: 360 }
      );

      expect(verdict.status).toBe('MODIFIED');
      expect(verdict.finalAction).toBe('ESCALATE_TO_MERCHANT');
      expect(verdict.violatedRules).toContain('HIGH_VALUE_LOW_CONFIDENCE');
    });

    it('Rule 5: Should enforce minimum 240m retry delay if AI suggested less than minimum', () => {
      const verdict = evaluatePolicy(
        {
          caseData: { amount: 4999, retryCount: 0, recoveredAmount: 0 },
          customer: { isOptedOut: false },
          merchantLimits: { minRetryDelayMinutes: 240 },
        },
        { recommendedAction: 'SCHEDULE_RETRY', confidenceScore: 0.90, suggestedDelayMinutes: 60 } // AI suggested 60m
      );

      expect(verdict.finalAction).toBe('SCHEDULE_RETRY');
      expect(verdict.finalDelayMinutes).toBe(240); // Enforced minimum 240m
      expect(verdict.violatedRules).toContain('MIN_RETRY_DELAY_VIOLATION');
    });

    it('Rule 6: Should override notification to ESCALATE_TO_MERCHANT if notification cap reached', () => {
      const verdict = evaluatePolicy(
        {
          caseData: { amount: 3000, retryCount: 0, recoveredAmount: 0 },
          customer: { isOptedOut: false },
          notificationCount: 1, // Already sent 1 notification
          merchantLimits: {},
        },
        { recommendedAction: 'SEND_NOTIFICATION', confidenceScore: 0.85, suggestedDelayMinutes: 0 }
      );

      expect(verdict.finalAction).toBe('ESCALATE_TO_MERCHANT');
      expect(verdict.violatedRules).toContain('SINGLE_TOUCH_NOTIFICATION_CAP');
    });
  });

  describe('Policy Service Integration Tests', () => {
    it('should validate case policy, store PolicyResult, and append audit log', async () => {
      const caseId = `case_pol_${Date.now()}`;
      await dbService.createRecoveryCase({
        caseId,
        paymentId: `pay_pol_${Date.now()}`,
        customerId: `cust_pol_${Date.now()}`,
        merchantId: 'mer_default',
        amount: 4999,
        revenueAtRisk: 4999,
        state: 'ACTION_PLANNED',
        retryCount: 0,
      });

      const result = await policyService.validateCasePolicy(caseId);

      expect(result.policyResult).toBeDefined();
      expect(result.verdict.status).toBe('APPROVED');
      expect(result.verdict.finalAction).toBe('SCHEDULE_RETRY');

      const auditLogs = await dbService.getAuditLogsByCaseId(caseId);
      const polLog = auditLogs.find((l) => l.summary.includes('Policy Guardrails evaluated'));
      expect(polLog).toBeDefined();
      expect(polLog.actor).toBe('POLICY_ENGINE');
    });
  });
});
