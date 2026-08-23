import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { enqueueScheduledRetry, getPendingMemoryJobs } from '../src/jobs/queue.js';
import { processRetryJob } from '../src/jobs/worker.js';
import { fastForwardTime } from '../src/jobs/timeTravel.js';
import { dbService } from '../src/services/dbService.js';

describe('Phase 11 — Background Jobs & Time-Travel Simulator Tests', () => {
  describe('Queue & Worker Unit Tests', () => {
    it('should enqueue scheduled payment retry job', async () => {
      const caseId = `case_job_${Date.now()}`;
      const job = await enqueueScheduledRetry(caseId, 240);

      expect(job).toBeDefined();
      expect(job.caseId).toBe(caseId);
      expect(job.delayMinutes).toBe(240);
      expect(job.status).toBe('PENDING');
    });

    it('should process retry job and resolve outcome', async () => {
      const caseId = `case_worker_${Date.now()}`;
      await dbService.createRecoveryCase({
        caseId,
        paymentId: `pay_worker_${Date.now()}`,
        customerId: `cust_worker_${Date.now()}`,
        merchantId: 'mer_default',
        amount: 4999,
        revenueAtRisk: 4999,
        state: 'ACTION_SCHEDULED',
        failureCategory: 'INSUFFICIENT_FUNDS',
      });

      const res = await processRetryJob({ caseId, jobId: `job_worker_${Date.now()}` });

      expect(res.success).toBe(true);
      expect(res.caseId).toBe(caseId);
      expect(['RECOVERED', 'FAILED']).toContain(res.finalState);
    });

    it('should fast-forward time and process pending scheduled cases', async () => {
      const caseId = `case_ff_${Date.now()}`;
      await dbService.createRecoveryCase({
        caseId,
        paymentId: `pay_ff_${Date.now()}`,
        customerId: `cust_ff_${Date.now()}`,
        merchantId: 'mer_default',
        amount: 3000,
        revenueAtRisk: 3000,
        state: 'ACTION_SCHEDULED',
        failureCategory: 'INSUFFICIENT_FUNDS',
      });

      const result = await fastForwardTime({ caseId, targetMinutes: 360 });

      expect(result.success).toBe(true);
      expect(result.jobsExecutedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Time-Travel Simulator API Routes Integration Tests', () => {
    it('POST /api/events/simulator/fast-forward should execute time-travel fast forward', async () => {
      const response = await request(app)
        .post('/api/events/simulator/fast-forward')
        .send({ targetMinutes: 360 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobsExecutedCount');
    });

    it('GET /api/events/simulator/jobs should list pending scheduled memory jobs', async () => {
      const response = await request(app).get('/api/events/simulator/jobs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobs');
    });
  });
});
