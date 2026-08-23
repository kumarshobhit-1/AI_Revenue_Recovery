import { Queue } from 'bullmq';
import Redis from 'ioredis';

// In-Memory Job Store fallback for offline testing / development when Redis is not running
const memoryJobQueue = [];

let retryQueue = null;

// Initializes Redis + BullMQ Queue connection if REDIS_URL is accessible.
export const initializeJobQueue = () => {
  if (retryQueue) return retryQueue;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    const connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    connection.on('error', (err) => {
      // Quietly log Redis offline warning without crashing app
    });

    retryQueue = new Queue('recovery-scheduled-retries', { connection });
    return retryQueue;
  } catch (error) {
    return null;
  }
};

//Enqueues a scheduled payment retry job.
export const enqueueScheduledRetry = async (caseId, delayMinutes = 360, metadata = {}) => {
  const delayMs = Math.max(1, Number(delayMinutes) || 360) * 60 * 1000;
  const scheduledTime = new Date(Date.now() + delayMs);

  const jobData = {
    jobId: `job_${caseId}_${Date.now()}`,
    caseId,
    delayMinutes,
    scheduledTime,
    enqueuedAt: new Date(),
    metadata,
    status: 'PENDING',
  };

  const queue = initializeJobQueue();
  if (queue) {
    try {
      await queue.add('process-scheduled-retry', jobData, {
        delay: delayMs,
        jobId: jobData.jobId,
        removeOnComplete: true,
      });
    } catch (e) {
      // Fallback to in-memory job store if Redis is unavailable
      memoryJobQueue.push(jobData);
    }
  } else {
    memoryJobQueue.push(jobData);
  }

  return jobData;
};

//Returns all pending scheduled jobs from memory queue.
 
export const getPendingMemoryJobs = () => {
  return memoryJobQueue.filter((j) => j.status === 'PENDING');
};

// Clears or updates memory jobs (used by time-travel simulator).

export const markMemoryJobCompleted = (jobId) => {
  const index = memoryJobQueue.findIndex((j) => j.jobId === jobId);
  if (index !== -1) {
    memoryJobQueue[index].status = 'COMPLETED';
  }
};
