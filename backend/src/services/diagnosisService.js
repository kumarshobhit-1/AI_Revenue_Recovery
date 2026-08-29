import { dbService } from './dbService.js';
import { aiProvider } from '../agent/aiProvider.js';
import { validateTransition } from '../engine/stateMachine.js';

export const diagnosisService = {
  // Diagnoses an ELIGIBLE recovery case using the AI Diagnostic Agent. Advances state from ELIGIBLE -> ACTION_PLANNED and stores AIDecision.
  async diagnoseCase(caseId, options = {}) {
    const recoveryCase = await dbService.getRecoveryCaseById(caseId);
    if (!recoveryCase) {
      throw new Error(`Recovery Case ${caseId} not found for AI diagnosis`);
    }

    const customer = await dbService.findOrCreateCustomer({
      customerId: recoveryCase.customerId,
      merchantId: recoveryCase.merchantId,
    });

    const payment = await dbService.getPaymentById(recoveryCase.paymentId);

    const context = {
      caseId,
      paymentId: recoveryCase.paymentId,
      amount: recoveryCase.amount,
      currency: recoveryCase.currency,
      failureReason: recoveryCase.failureCategory || payment?.failureReason || 'INSUFFICIENT_FUNDS',
      gatewayErrorCode: payment?.errorCode || recoveryCase.failureCategory,
      paymentMethod: payment?.paymentMethod || 'CARD',
      previousAttempts: recoveryCase.retryCount || 0,
      customer: {
        ltv: customer.ltv,
        successfulTxnCount: customer.successfulTxnCount,
        failedTxnCount: customer.failedTxnCount,
        isOptedOut: customer.isOptedOut,
      },
    };

    if (options.isBenchmark) {
      context.isBenchmark = true;
    }

    // 1. Invoke AI Diagnostic Agent
    const aiOutput = await aiProvider.diagnose(context, options);

    // 2. Persist AIDecision document
    const decisionId = `dec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const aiDecision = await dbService.saveAIDecision({
      decisionId,
      caseId,
      classification: aiOutput.classification,
      confidenceScore: aiOutput.confidenceScore,
      recommendedAction: aiOutput.recommendedAction,
      suggestedDelayMinutes: aiOutput.suggestedDelayMinutes,
      suggestedChannel: aiOutput.suggestedChannel,
      rationale: aiOutput.rationale,
      rawResponse: aiOutput,
    });

    // 3. Advance State Machine: ELIGIBLE -> ACTION_PLANNED
    validateTransition(recoveryCase.state, 'ACTION_PLANNED', caseId);

    await dbService.updateCaseState(
      caseId,
      'ACTION_PLANNED',
      `AI Diagnosis completed. Classification: ${aiOutput.classification} (Confidence: ${(aiOutput.confidenceScore * 100).toFixed(0)}%). Recommended Action: ${aiOutput.recommendedAction}`,
      'AI_AGENT',
      { decisionId, recommendedAction: aiOutput.recommendedAction }
    );

    const updatedCase = await dbService.getRecoveryCaseById(caseId);

    return {
      recoveryCase: updatedCase,
      aiDecision,
    };
  },
};
