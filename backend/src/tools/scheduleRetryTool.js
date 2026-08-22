import { dbService } from '../services/dbService.js';
import { validateTransition } from '../engine/stateMachine.js';

// Bounded Tool: Schedule Payment Retry Schedules a delayed payment retry attempt for a given Recovery Case.
export const schedulePaymentRetryTool = async ({ caseId, delayMinutes = 360, reason = 'AI_RECOMMENDED_RETRY' }) => {
  const recoveryCase = await dbService.getRecoveryCaseById(caseId);
  if (!recoveryCase) {
    throw new Error(`Case ${caseId} not found for scheduling retry`);
  }

  const delayMs = Math.max(1, Number(delayMinutes) || 360) * 60 * 1000;
  const nextScheduledRetry = new Date(Date.now() + delayMs);
  const newRetryCount = (recoveryCase.retryCount || 0) + 1;

  // Validate state transition ACTION_PLANNED -> ACTION_SCHEDULED
  validateTransition(recoveryCase.state, 'ACTION_SCHEDULED', caseId);

  // Update RecoveryCase entity fields
  recoveryCase.nextScheduledRetry = nextScheduledRetry;
  recoveryCase.retryCount = newRetryCount;
  if (dbService.isDbConnected && dbService.isDbConnected()) {
    await recoveryCase.save();
  }

  await dbService.updateCaseState(
    caseId,
    'ACTION_SCHEDULED',
    `Payment retry #${newRetryCount} scheduled for ${nextScheduledRetry.toISOString()} (in ${delayMinutes} minutes). Reason: ${reason}`,
    'AI_AGENT',
    { nextScheduledRetry, retryCount: newRetryCount, delayMinutes }
  );

  return {
    success: true,
    toolName: 'schedule_payment_retry',
    caseId,
    retryCount: newRetryCount,
    nextScheduledRetry,
    delayMinutes,
  };
};
