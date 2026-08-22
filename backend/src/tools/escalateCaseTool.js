import { dbService } from '../services/dbService.js';
import { validateTransition } from '../engine/stateMachine.js';

// Bounded Tool: Escalate Case to MerchantFlags high-value, ambiguous, or policy-flagged cases for manual human review in the dashboard.
export const escalateCaseTool = async ({ caseId, reason = 'HIGH_VALUE_AMBIGUOUS_DECLINE' }) => {
  const recoveryCase = await dbService.getRecoveryCaseById(caseId);
  if (!recoveryCase) {
    throw new Error(`Case ${caseId} not found for escalation`);
  }

  // Validate state transition ACTION_PLANNED -> ESCALATED
  validateTransition(recoveryCase.state, 'ESCALATED', caseId);

  await dbService.updateCaseState(
    caseId,
    'ESCALATED',
    `Case escalated for manual merchant review in Dashboard. Escalation Reason: ${reason}`,
    'AI_AGENT',
    { escalationReason: reason, escalatedAt: new Date() }
  );

  return {
    success: true,
    toolName: 'escalate_case',
    caseId,
    state: 'ESCALATED',
    reason,
  };
};
