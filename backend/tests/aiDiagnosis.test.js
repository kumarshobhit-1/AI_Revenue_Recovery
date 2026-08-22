import { describe, it, expect } from 'vitest';
import { validateAIDiagnosis } from '../src/agent/schemas/diagnosisSchema.js';
import { getRuleBasedDiagnosis } from '../src/agent/ruleFallback.js';
import { aiProvider } from '../src/agent/aiProvider.js';
import { diagnosisService } from '../src/services/diagnosisService.js';
import { dbService } from '../src/services/dbService.js';
import { AIDecision } from '../src/models/index.js';

describe('Phase 7 — AI Failure Diagnosis Engine Tests', () => {
  describe('Zod Schema Validation Tests', () => {
    it('should validate structured AI diagnosis output', () => {
      const sampleOutput = {
        classification: 'TEMPORARY_LIQUIDITY_ISSUE',
        confidenceScore: 0.88,
        recommendedAction: 'SCHEDULE_RETRY',
        suggestedDelayMinutes: 360,
        suggestedChannel: null,
        rationale: ['Customer has successful history', 'Insufficient balance is temporary'],
      };

      const validated = validateAIDiagnosis(sampleOutput);
      expect(validated.classification).toBe('TEMPORARY_LIQUIDITY_ISSUE');
      expect(validated.confidenceScore).toBe(0.88);
      expect(validated.recommendedAction).toBe('SCHEDULE_RETRY');
    });

    it('should reject AI output missing required rationale array', () => {
      const invalidOutput = {
        classification: 'INVALID_TEST',
        confidenceScore: 0.5,
        recommendedAction: 'SCHEDULE_RETRY',
        suggestedDelayMinutes: 360,
        rationale: [], // Empty rationale violates Zod schema
      };

      expect(() => validateAIDiagnosis(invalidOutput)).toThrow();
    });
  });

  describe('Rule-Based Fallback Engine Tests', () => {
    it('should return rule-based diagnosis for INSUFFICIENT_FUNDS', () => {
      const diag = getRuleBasedDiagnosis({
        paymentId: 'pay_test_01',
        amount: 4999,
        currency: 'INR',
        failureReason: 'INSUFFICIENT_FUNDS',
      });

      expect(diag.classification).toBe('TEMPORARY_LIQUIDITY_ISSUE');
      expect(diag.recommendedAction).toBe('SCHEDULE_RETRY');
      expect(diag.suggestedDelayMinutes).toBe(360);
    });

    it('should return FAST RETRY for BANK_SERVER_DOWN', () => {
      const diag = getRuleBasedDiagnosis({
        paymentId: 'pay_test_02',
        amount: 2500,
        currency: 'INR',
        failureReason: 'BANK_SERVER_DOWN',
      });

      expect(diag.classification).toBe('GATEWAY_TECHNICAL_OUTAGE');
      expect(diag.suggestedDelayMinutes).toBe(60);
    });
  });

  describe('Diagnosis Service Integration Tests', () => {
    it('should diagnose an ELIGIBLE case and advance state to ACTION_PLANNED', async () => {
      const caseId = `case_diag_${Date.now()}`;
      await dbService.createRecoveryCase({
        caseId,
        paymentId: `pay_diag_${Date.now()}`,
        customerId: `cust_diag_${Date.now()}`,
        merchantId: 'mer_default',
        amount: 4999,
        revenueAtRisk: 4999,
        state: 'ELIGIBLE',
        failureCategory: 'INSUFFICIENT_FUNDS',
      });

      const result = await diagnosisService.diagnoseCase(caseId);

      expect(result.recoveryCase.state).toBe('ACTION_PLANNED');
      expect(result.aiDecision).toBeDefined();
      expect(result.aiDecision.recommendedAction).toBe('SCHEDULE_RETRY');

      // Verify Audit Log entry
      const auditLogs = await dbService.getAuditLogsByCaseId(caseId);
      const diagLog = auditLogs.find((l) => l.summary.includes('AI Diagnosis completed'));
      expect(diagLog).toBeDefined();
      expect(diagLog.actor).toBe('AI_AGENT');
    });
  });
});
