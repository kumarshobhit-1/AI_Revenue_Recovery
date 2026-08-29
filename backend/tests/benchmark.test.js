import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { benchmarkEngine } from '../src/engine/benchmarkEngine.js';

describe('Phase 13 — Synthetic Evaluation Engine & Benchmarking Suite Tests', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recoverai';
    await connectDB(uri);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('1. benchmarkEngine.runBatchBenchmark - should process a batch of synthetic failures with real accuracy', async () => {
    const result = await benchmarkEngine.runBatchBenchmark(5, 'mer_default');

    expect(result).toBeDefined();
    expect(result.batchSize).toBe(5);
    expect(typeof result.totalRevenueAtRisk).toBe('number');
    expect(typeof result.recoveryRatePercentage).toBe('number');
    expect(typeof result.aiAccuracyPercentage).toBe('number');
    expect(result.aiAccuracyPercentage).toBeGreaterThan(0);
    expect(Array.isArray(result.casesSummary)).toBe(true);
    expect(result.casesSummary.length).toBe(5);

    // Verify non-N/A classification & ground truth alignment
    result.casesSummary.forEach((item) => {
      expect(item.aiClassification).not.toBe('N/A');
      expect(item.expectedClassification).not.toBe('N/A');
      expect(typeof item.isCorrect).toBe('boolean');
    });
  });

  it('2. POST /api/events/simulator/benchmark - should execute batch benchmark via HTTP API', async () => {
    const res = await request(app)
      .post('/api/events/simulator/benchmark')
      .send({ batchSize: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.batchSize).toBe(5);
    expect(res.body.data.aiAccuracyPercentage).toBeGreaterThan(0);
    expect(res.body.data.avgLatencyMs).toBeGreaterThanOrEqual(0);
  });
});
