import express from 'express';
import { checkIdempotency } from '../middleware/idempotency.js';
import { validateRequest } from '../middleware/validate.js';
import {
  getCaseDetailsSchema,
  listCasesSchema,
  getMetricsSchema,
  resolveOutcomeSchema,
  fastForwardSchema,
  simulateEventSchema,
} from '../validators/eventValidators.js';
import {
  handleWebhook,
  handleSimulate,
  listCases,
  getCaseDetails,
  resolveCaseOutcome,
  getMetrics,
  handleFastForward,
  listPendingJobs,
} from '../controllers/eventController.js';

const router = express.Router();

// Webhook Event Ingestion
router.post('/webhook', checkIdempotency, handleWebhook);

// Synthetic Event Simulator Routes
router.post('/simulate', validateRequest(simulateEventSchema), checkIdempotency, handleSimulate);
router.post('/simulator/fast-forward', validateRequest(fastForwardSchema), handleFastForward);
router.get('/simulator/jobs', listPendingJobs);

// Financial Metrics Endpoint
router.get('/metrics', validateRequest(getMetricsSchema), getMetrics);

// Recovery Cases Management Routes
router.get('/cases', validateRequest(listCasesSchema), listCases);
router.get('/cases/:caseId', validateRequest(getCaseDetailsSchema), getCaseDetails);
router.post('/cases/:caseId/resolve', validateRequest(resolveOutcomeSchema), resolveCaseOutcome);

export default router;
