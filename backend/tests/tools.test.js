import { describe, it, expect } from 'vitest';
import {
  schedulePaymentRetryTool,
  sendNotificationTool,
  generateRecoveryLinkTool,
  escalateCaseTool,
  stopWorkflowTool,
  executeTool,
} from '../src/tools/index.js';
import { dbService } from '../src/services/dbService.js';

describe('Phase 8 — Agent Bounded Tools Unit & Integration Tests', () => {
  it('should schedule payment retry, update retryCount, and advance state to ACTION_SCHEDULED', async () => {
    const caseId = `case_tool_retry_${Date.now()}`;
    await dbService.createRecoveryCase({
      caseId,
      paymentId: `pay_tool_${Date.now()}`,
      customerId: `cust_tool_${Date.now()}`,
      merchantId: 'mer_default',
      amount: 4999,
      revenueAtRisk: 4999,
      state: 'ACTION_PLANNED',
      retryCount: 0,
    });

    const result = await schedulePaymentRetryTool({ caseId, delayMinutes: 240 });

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(1);
    expect(result.delayMinutes).toBe(240);

    const updatedCase = await dbService.getRecoveryCaseById(caseId);
    expect(updatedCase.state).toBe('ACTION_SCHEDULED');
    expect(updatedCase.retryCount).toBe(1);
  });

  it('should send single-touch recovery notification for active customer', async () => {
    const customerId = `cust_active_${Date.now()}`;
    await dbService.findOrCreateCustomer({
      customerId,
      merchantId: 'mer_default',
      name: 'Priya Patel',
      email: 'priya@example.com',
    });

    const caseId = `case_tool_notif_${Date.now()}`;
    await dbService.createRecoveryCase({
      caseId,
      paymentId: `pay_notif_${Date.now()}`,
      customerId,
      merchantId: 'mer_default',
      amount: 2500,
      revenueAtRisk: 2500,
      state: 'ACTION_PLANNED',
    });

    const result = await sendNotificationTool({ caseId, channel: 'WHATSAPP' });

    expect(result.success).toBe(true);
    expect(result.channel).toBe('WHATSAPP');
    expect(result.recoveryUrl).toContain(caseId);

    const updatedCase = await dbService.getRecoveryCaseById(caseId);
    expect(updatedCase.state).toBe('ACTION_SCHEDULED');
  });

  it('should suppress notification when customer is opted out', async () => {
    const customerId = `cust_optout_${Date.now()}`;
    const cust = await dbService.findOrCreateCustomer({
      customerId,
      merchantId: 'mer_default',
      name: 'Opted Out User',
    });
    cust.isOptedOut = true;
    if (dbService.isDbConnected && dbService.isDbConnected()) await cust.save();

    const caseId = `case_optout_${Date.now()}`;
    await dbService.createRecoveryCase({
      caseId,
      paymentId: `pay_optout_${Date.now()}`,
      customerId,
      merchantId: 'mer_default',
      amount: 1000,
      revenueAtRisk: 1000,
      state: 'ACTION_PLANNED',
    });

    const result = await sendNotificationTool({ caseId, channel: 'SMS' });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('CUSTOMER_OPTED_OUT');
    expect(result.status).toBe('OPTED_OUT');
  });

  it('should generate single-use recovery checkout link', async () => {
    const caseId = `case_link_${Date.now()}`;
    await dbService.createRecoveryCase({
      caseId,
      paymentId: `pay_link_${Date.now()}`,
      customerId: `cust_link_${Date.now()}`,
      merchantId: 'mer_default',
      amount: 7500,
      revenueAtRisk: 7500,
      state: 'ACTION_PLANNED',
    });

    const result = await generateRecoveryLinkTool({ caseId, expiryHours: 12 });

    expect(result.success).toBe(true);
    expect(result.recoveryUrl).toContain('checkout.recoverai.dev');
    expect(result.token).toContain('rec_token_');
  });

  it('should escalate case to merchant and set state to ESCALATED', async () => {
    const caseId = `case_esc_${Date.now()}`;
    await dbService.createRecoveryCase({
      caseId,
      paymentId: `pay_esc_${Date.now()}`,
      customerId: `cust_esc_${Date.now()}`,
      merchantId: 'mer_default',
      amount: 60000,
      revenueAtRisk: 60000,
      state: 'ACTION_PLANNED',
    });

    const result = await escalateCaseTool({ caseId, reason: 'HIGH_VALUE_TRANSACTION' });

    expect(result.success).toBe(true);
    expect(result.state).toBe('ESCALATED');
  });

  it('should stop workflow and set state to STOPPED', async () => {
    const caseId = `case_stop_${Date.now()}`;
    await dbService.createRecoveryCase({
      caseId,
      paymentId: `pay_stop_${Date.now()}`,
      customerId: `cust_stop_${Date.now()}`,
      merchantId: 'mer_default',
      amount: 1000,
      revenueAtRisk: 1000,
      state: 'ACTION_PLANNED',
    });

    const result = await stopWorkflowTool({ caseId, reason: 'MAX_RETRIES_REACHED' });

    expect(result.success).toBe(true);
    expect(result.state).toBe('STOPPED');
  });

  it('should execute tool via executeTool central wrapper and reject invalid tools', async () => {
    const caseId = `case_exec_${Date.now()}`;
    await dbService.createRecoveryCase({
      caseId,
      paymentId: `pay_exec_${Date.now()}`,
      customerId: `cust_exec_${Date.now()}`,
      merchantId: 'mer_default',
      amount: 3000,
      revenueAtRisk: 3000,
      state: 'ACTION_PLANNED',
    });

    const result = await executeTool('SCHEDULE_RETRY', caseId, { delayMinutes: 180 });
    expect(result.success).toBe(true);

    await expect(executeTool('INVALID_TOOL_NAME', caseId)).rejects.toThrow('Invalid tool action');
  });
});
