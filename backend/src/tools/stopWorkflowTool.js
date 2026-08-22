import { dbService } from '../services/dbService.js';
import { validateTransition } from '../engine/stateMachine.js';

// Bounded Tool: Stop Recovery Workflow Terminates recovery attempt due to policy limits, customer opt-out, or max retries reached.
export const stopWorkflowTool = async ({ caseId, reason = 'POLICY_STOPPING_RULE_TRIGGERED' }) => {
  const recoveryCase = await dbService.getRecoveryCaseById(caseId);
  if (!recoveryCase) {
    throw new Error(`Case ${caseId} not found for stopping workflow`);
  }

  // Validate state transition ACTION_PLANNED -> STOPPED
  validateTransition(recoveryCase.state, 'STOPPED', caseId);

  await dbService.updateCaseState(
    caseId,
    'STOPPED',
    `Recovery workflow terminated. Case locked in STOPPED state. Reason: ${reason}`,
    'AI_AGENT',
    { stoppingReason: reason, stoppedAt: new Date() }
  );

  return {
    success: true,
    toolName: 'stop_workflow',
    caseId,
    state: 'STOPPED',
    reason,
  };
};
