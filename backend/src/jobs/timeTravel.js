import { dbService } from '../services/dbService.js';
import { processRetryJob } from './worker.js';
import { getPendingMemoryJobs } from './queue.js';

// Time-Travel Fast-Forward Harness. Allows evaluators, testers, and pitch presenters to trigger pending scheduled retries instantly!
export const fastForwardTime = async ({ caseId, targetMinutes = 360 }) => {
  const executedJobs = [];
  let totalRecoveredInWarp = 0;

  if (caseId) {
    // Fast-forward specific case
    const recoveryCase = await dbService.getRecoveryCaseById(caseId);
    if (recoveryCase && ['ACTION_SCHEDULED', 'ACTION_PLANNED'].includes(recoveryCase.state)) {
      const res = await processRetryJob({ caseId, jobId: `warp_${caseId}` });
      executedJobs.push(res);
      if (res.executedOutcome === 'SUCCESS') {
        totalRecoveredInWarp += res.recoveredAmount || 0;
      }
    }
  } else {
    // Fast-forward all active pending scheduled cases
    const { cases } = await dbService.listRecoveryCases({}, 1, 1000);
    const scheduledCases = cases.filter((c) => ['ACTION_SCHEDULED', 'ACTION_PLANNED'].includes(c.state));

    for (const c of scheduledCases) {
      const res = await processRetryJob({ caseId: c.caseId, jobId: `warp_${c.caseId}` });
      executedJobs.push(res);
      if (res.executedOutcome === 'SUCCESS') {
        totalRecoveredInWarp += res.recoveredAmount || 0;
      }
    }

    // Also process any pending memory jobs
    const memoryJobs = getPendingMemoryJobs();
    for (const job of memoryJobs) {
      if (!executedJobs.some((j) => j.caseId === job.caseId)) {
        const res = await processRetryJob(job);
        executedJobs.push(res);
        if (res.executedOutcome === 'SUCCESS') {
          totalRecoveredInWarp += res.recoveredAmount || 0;
        }
      }
    }
  }

  return {
    success: true,
    fastForwardedMinutes: targetMinutes,
    jobsExecutedCount: executedJobs.length,
    totalRecoveredInWarp,
    executedJobs,
  };
};
