import { dbService } from './dbService.js';
import { evaluateRevenueRisk } from '../engine/riskEngine.js';
import { validateTransition } from '../engine/stateMachine.js';

export const riskService = {
  // Evaluates revenue-at-risk and eligibility for a given Recovery Case. Advances state from ANALYZING -> ELIGIBLE (or STOPPED / FAILED if ineligible).
  async evaluateCaseRisk(caseId) {
    const recoveryCase = await dbService.getRecoveryCaseById(caseId);
    if (!recoveryCase) {
      throw new Error(`Recovery Case ${caseId} not found for risk evaluation`);
    }

    // Fetch associated customer
    const customer = await dbService.findOrCreateCustomer({
      customerId: recoveryCase.customerId,
      merchantId: recoveryCase.merchantId,
    });

    // Run deterministic risk evaluation engine
    const evaluation = evaluateRevenueRisk({
      amount: recoveryCase.amount,
      failureReason: recoveryCase.failureCategory || 'INSUFFICIENT_FUNDS',
      customer,
    });

    if (!evaluation.isEligible) {
      // Ineligible case: transition from ANALYZING -> STOPPED or FAILED
      const targetState = evaluation.rejectionReason?.includes('PERMANENT') ? 'FAILED' : 'STOPPED';
      validateTransition(recoveryCase.state, targetState, caseId);

      await dbService.updateCaseState(
        caseId,
        targetState,
        `Case marked INELIGIBLE for automated recovery. Reason: ${evaluation.rejectionReason}`,
        'SYSTEM',
        { evaluation }
      );

      return {
        caseId,
        isEligible: false,
        state: targetState,
        evaluation,
      };
    }

    // Eligible case: update revenue at risk and transition ANALYZING -> ELIGIBLE
    validateTransition(recoveryCase.state, 'ELIGIBLE', caseId);

    // Save updated revenueAtRisk value
    recoveryCase.revenueAtRisk = evaluation.revenueAtRisk;
    if (dbService.isDbConnected && dbService.isDbConnected()) {
      await recoveryCase.save();
    }

    await dbService.updateCaseState(
      caseId,
      'ELIGIBLE',
      `Revenue at risk evaluated to ${recoveryCase.currency} ${evaluation.revenueAtRisk} (Priority: ${evaluation.priority}, Probability: ${(evaluation.recoveryProbability * 100).toFixed(0)}%). Case cleared for AI intervention.`,
      'SYSTEM',
      { evaluation }
    );

    const updatedCase = await dbService.getRecoveryCaseById(caseId);

    return {
      caseId,
      isEligible: true,
      state: updatedCase.state,
      evaluation,
      recoveryCase: updatedCase,
    };
  },
};
