import { describe, it, expect } from 'vitest';
import {
  evaluateRevenueRisk,
  calculateLtvMultiplier,
  calculateSuccessRatio,
} from '../src/engine/riskEngine.js';
import { riskService } from '../src/services/riskService.js';
import { dbService } from '../src/services/dbService.js';

describe('Phase 6 — Revenue-at-Risk Engine Tests', () => {
  describe('Risk Formula Unit Tests', () => {
    it('should calculate LTV multiplier correctly with 2.5x cap', () => {
      expect(calculateLtvMultiplier(0)).toBe(1.0);
      expect(calculateLtvMultiplier(50000)).toBe(1.5);
      expect(calculateLtvMultiplier(150000)).toBe(2.5);
      expect(calculateLtvMultiplier(500000)).toBe(2.5); // Capped at 2.5
    });

    it('should calculate success ratio accurately', () => {
      expect(calculateSuccessRatio(10, 2)).toBe(10 / 12);
      expect(calculateSuccessRatio(0, 0)).toBe(0.70); // Baseline default
      expect(calculateSuccessRatio(0, 5)).toBe(0);
    });

    it('should mark temporary failure with high LTV customer as HIGH priority and ELIGIBLE', () => {
      const result = evaluateRevenueRisk({
        amount: 4999,
        failureReason: 'INSUFFICIENT_FUNDS',
        customer: {
          ltv: 42000,
          successfulTxnCount: 12,
          failedTxnCount: 1,
          isOptedOut: false,
        },
      });

      expect(result.isEligible).toBe(true);
      expect(result.recoveryProbability).toBeGreaterThan(0.70);
      expect(result.priority).toBe('HIGH');
      expect(result.revenueAtRisk).toBeGreaterThan(4999); // LTV weighted
    });

    it('should reject unrecoverable failure reason (STOLEN_CARD) as INELIGIBLE', () => {
      const result = evaluateRevenueRisk({
        amount: 10000,
        failureReason: 'STOLEN_CARD',
        customer: { ltv: 50000, successfulTxnCount: 10, failedTxnCount: 0 },
      });

      expect(result.isEligible).toBe(false);
      expect(result.recoveryProbability).toBe(0.0);
      expect(result.priority).toBe('NONE');
      expect(result.rejectionReason).toContain('PERMANENT_UNRECOVERABLE_FAILURE');
    });

    it('should reject opted-out customer as INELIGIBLE', () => {
      const result = evaluateRevenueRisk({
        amount: 2500,
        failureReason: 'INSUFFICIENT_FUNDS',
        customer: { isOptedOut: true },
      });

      expect(result.isEligible).toBe(false);
      expect(result.rejectionReason).toBe('CUSTOMER_OPTED_OUT');
    });
  });

  describe('Risk Service State Advancement Integration Tests', () => {
    it('should evaluate case risk and advance case from ANALYZING to ELIGIBLE', async () => {
      const customerId = `cust_risk_${Date.now()}`;
      await dbService.findOrCreateCustomer({
        customerId,
        merchantId: 'mer_default',
        ltv: 50000,
        successfulTxnCount: 10,
      });

      const caseId = `case_risk_${Date.now()}`;
      await dbService.createRecoveryCase({
        caseId,
        paymentId: `pay_risk_${Date.now()}`,
        customerId,
        merchantId: 'mer_default',
        amount: 4999,
        revenueAtRisk: 4999,
        state: 'ANALYZING',
        failureCategory: 'INSUFFICIENT_FUNDS',
      });

      const result = await riskService.evaluateCaseRisk(caseId);

      expect(result.isEligible).toBe(true);
      expect(result.state).toBe('ELIGIBLE');
      expect(result.evaluation.priority).toBe('HIGH');

      const auditLogs = await dbService.getAuditLogsByCaseId(caseId);
      const riskLog = auditLogs.find((l) => l.summary.includes('Revenue at risk evaluated'));
      expect(riskLog).toBeDefined();
    });
  });
});
