import { dbService } from '../services/dbService.js';
import { outcomeService } from '../services/outcomeService.js';
import { markMemoryJobCompleted } from './queue.js';

// Executes a scheduled payment retry job.
export const processRetryJob = async (jobData) => {
  const { caseId, jobId } = jobData;

  const recoveryCase = await dbService.getRecoveryCaseById(caseId);
  if (!recoveryCase) {
    if (jobId) markMemoryJobCompleted(jobId);
    return { success: false, reason: `Case ${caseId} not found` };
  }

  // Ensure case is in an executable state (ACTION_SCHEDULED or ACTION_PLANNED)
  if (['RECOVERED', 'STOPPED', 'FAILED', 'ESCALATED'].includes(recoveryCase.state)) {
    if (jobId) markMemoryJobCompleted(jobId);
    return {
      success: false,
      reason: `Case ${caseId} is already in terminal state '${recoveryCase.state}'. Execution skipped.`,
    };
  }

  // Update case state to ACTION_EXECUTED
  await dbService.updateCaseState(
    caseId,
    'ACTION_EXECUTED',
    `Scheduled retry #${recoveryCase.retryCount || 1} executing via background worker...`,
    'SYSTEM'
  );

  // Simulate payment gateway retry attempt
  const failureCategory = (recoveryCase.failureCategory || 'INSUFFICIENT_FUNDS').toUpperCase();
  const isTemporary = ['INSUFFICIENT_FUNDS', 'BANK_SERVER_DOWN', 'NETWORK_TIMEOUT', 'GATEWAY_DECLINE_TEMP'].includes(failureCategory);

  // Temporary failures succeed on retry with 85% probability in simulation
  const isRetrySuccessful = isTemporary ? Math.random() < 0.85 : Math.random() < 0.30;

  let outcomeResult;
  if (isRetrySuccessful) {
    outcomeResult = await outcomeService.resolveOutcome(
      caseId,
      'SUCCESS',
      `Automated retry #${recoveryCase.retryCount || 1} executed successfully by background worker.`
    );
  } else {
    outcomeResult = await outcomeService.resolveOutcome(
      caseId,
      'FAILURE',
      `Automated retry #${recoveryCase.retryCount || 1} failed on gateway processing.`
    );
  }

  if (jobId) markMemoryJobCompleted(jobId);

  return {
    success: true,
    caseId,
    jobId,
    executedOutcome: outcomeResult.outcome,
    finalState: outcomeResult.recoveryCase.state,
    recoveredAmount: outcomeResult.recoveryCase.recoveredAmount,
  };
};
