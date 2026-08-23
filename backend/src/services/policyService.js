import { dbService } from './dbService.js';
import { evaluatePolicy } from '../engine/policyEngine.js';
import { AIDecision } from '../models/AIDecision.js';

export const policyService = {
  // Validates an AI Decision against merchant policy limits and financial guardrails. Persists PolicyResult and audit log entry.
  async validateCasePolicy(caseId) {
    const recoveryCase = await dbService.getRecoveryCaseById(caseId);
    if (!recoveryCase) {
      throw new Error(`Case ${caseId} not found for policy validation`);
    }

    const customer = await dbService.findOrCreateCustomer({
      customerId: recoveryCase.customerId,
      merchantId: recoveryCase.merchantId,
    });

    const merchant = await dbService.findOrCreateMerchant({
      merchantId: recoveryCase.merchantId,
      name: 'Default Merchant Store',
      email: 'merchant@recoverai.dev',
      apiKey: 'key_dev_default',
    });

    // Fetch latest AIDecision for this case
    let aiDecision;
    if (dbService.isDbConnected && dbService.isDbConnected()) {
      aiDecision = await AIDecision.findOne({ caseId }).sort({ createdAt: -1 });
    }
    if (!aiDecision) {
      aiDecision = {
        decisionId: `dec_fallback_${Date.now()}`,
        recommendedAction: 'SCHEDULE_RETRY',
        confidenceScore: 0.85,
        suggestedDelayMinutes: 360,
        suggestedChannel: null,
      };
    }

    // Evaluate policy rules
    const verdict = evaluatePolicy(
      {
        caseData: recoveryCase,
        customer,
        notificationCount: 0,
        merchantLimits: merchant.policyLimits || {},
      },
      aiDecision
    );

    // Save PolicyResult document
    const policyResultId = `pol_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const policyResult = await dbService.savePolicyResult({
      policyResultId,
      caseId,
      decisionId: aiDecision.decisionId || `dec_${caseId}`,
      status: verdict.status,
      violatedRules: verdict.violatedRules,
      appliedOverrides: {
        originalAction: verdict.originalAction,
        finalAction: verdict.finalAction,
        originalDelayMinutes: verdict.originalDelayMinutes,
        finalDelayMinutes: verdict.finalDelayMinutes,
        ...verdict.appliedOverrides,
      },
    });

    // Log policy verification in audit trail
    await dbService.appendAuditLog({
      auditId: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      caseId,
      actor: 'POLICY_ENGINE',
      eventType: 'POLICY_EVALUATED',
      previousState: recoveryCase.state,
      newState: recoveryCase.state,
      summary: `Policy Guardrails evaluated. Status: ${verdict.status}. Approved Action: ${verdict.finalAction}${verdict.violatedRules.length > 0 ? ` (Violated Rules: ${verdict.violatedRules.join(', ')})` : ''}`,
      metadata: { policyResultId, verdict },
    });

    return {
      policyResult,
      recoveryCase,
      aiDecision,
      verdict,
    };
  },
};
