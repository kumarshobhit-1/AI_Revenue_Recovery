import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { orchestrateRecovery } from '../src/engine/orchestrator.js';
import { outcomeService } from '../src/services/outcomeService.js';
import { dbService } from '../src/services/dbService.js';

describe('Phase 10 — Closed-Loop Recovery Orchestrator & Metrics Tests', () => {
  describe('Full Recovery Orchestrator Pipeline Integration', () => {
    it('should run end-to-end recovery pipeline from event payload to tool execution', async () => {
      const payload = {
        paymentId: `pay_orch_${Date.now()}`,
        merchantId: 'mer_default',
        customerId: `cust_orch_${Date.now()}`,
        customerName: 'Vikram Mehta',
        customerEmail: 'vikram@example.com',
        customerLtv: 35000,
        customerSuccessfulTxns: 8,
        amount: 4999,
        failureReason: 'INSUFFICIENT_FUNDS',
      };

      const result = await orchestrateRecovery(payload);

      expect(result.success).toBe(true);
      expect(result.caseId).toBeDefined();
      expect(result.finalState).toBe('ACTION_SCHEDULED');
      expect(result.approvedAction).toBe('SCHEDULE_RETRY');
      expect(result.toolResult.success).toBe(true);

      // Verify complete Audit Trail exists
      const auditLogs = await dbService.getAuditLogsByCaseId(result.caseId);
      expect(auditLogs.length).toBeGreaterThanOrEqual(4);
      expect(auditLogs.some((l) => l.eventType === 'EVENT_INGESTED')).toBe(true);
      expect(auditLogs.some((l) => l.actor === 'AI_AGENT')).toBe(true);
      expect(auditLogs.some((l) => l.actor === 'POLICY_ENGINE')).toBe(true);
    });
  });

  describe('Outcome Resolution & Financial Metrics Service', () => {
    it('should resolve payment outcome to SUCCESS, calculate recoveredAmount, and update LTV', async () => {
      const caseId = `case_out_${Date.now()}`;
      const customerId = `cust_out_${Date.now()}`;

      await dbService.findOrCreateCustomer({
        customerId,
        merchantId: 'mer_default',
        ltv: 10000,
        successfulTxnCount: 2,
      });

      await dbService.createRecoveryCase({
        caseId,
        paymentId: `pay_out_${Date.now()}`,
        customerId,
        merchantId: 'mer_default',
        amount: 5000,
        revenueAtRisk: 5000,
        state: 'ACTION_SCHEDULED',
      });

      const res = await outcomeService.resolveOutcome(caseId, 'SUCCESS', 'Bank retry processed successfully');

      expect(res.outcome).toBe('SUCCESS');
      expect(res.recoveryCase.state).toBe('RECOVERED');
      expect(res.recoveryCase.recoveredAmount).toBe(5000);

      const customer = await dbService.findOrCreateCustomer({ customerId, merchantId: 'mer_default' });
      expect(customer.ltv).toBe(15000);
      expect(customer.successfulTxnCount).toBe(3);
    });

    it('should calculate accurate batch recovery financial metrics', async () => {
      const metrics = await outcomeService.getBatchRecoveryMetrics('mer_default');

      expect(metrics).toHaveProperty('totalRevenueAtRisk');
      expect(metrics).toHaveProperty('totalRevenueRecovered');
      expect(metrics).toHaveProperty('recoveryRate');
      expect(metrics).toHaveProperty('totalCases');
      expect(metrics.totalCases).toBeGreaterThan(0);
    });
  });

  describe('Outcome & Metrics API Routes', () => {
    it('GET /api/events/metrics should return financial batch recovery metrics', async () => {
      const response = await request(app).get('/api/events/metrics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenueAtRisk');
      expect(response.body.data).toHaveProperty('totalRevenueRecovered');
      expect(response.body.data).toHaveProperty('recoveryRate');
    });

    it('POST /api/events/cases/:caseId/resolve should resolve case outcome', async () => {
      const caseId = `case_route_res_${Date.now()}`;
      await dbService.createRecoveryCase({
        caseId,
        paymentId: `pay_route_res_${Date.now()}`,
        customerId: `cust_route_res_${Date.now()}`,
        merchantId: 'mer_default',
        amount: 2000,
        revenueAtRisk: 2000,
        state: 'ACTION_SCHEDULED',
      });

      const response = await request(app)
        .post(`/api/events/cases/${caseId}/resolve`)
        .send({ outcome: 'SUCCESS', notes: 'Manual payment link payment completed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.outcome).toBe('SUCCESS');
      expect(response.body.data.recoveryCase.state).toBe('RECOVERED');
    });
  });
});
