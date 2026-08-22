import express from 'express';
import { checkIdempotency } from '../middleware/idempotency.js';
import { validateRequest } from '../middleware/validate.js';
import {
  getCaseDetailsSchema,
  listCasesSchema,
  simulateEventSchema,
} from '../validators/eventValidators.js';
import {
  handleWebhook,
  handleSimulate,
  listCases,
  getCaseDetails,
} from '../controllers/eventController.js';

const router = express.Router();

// Webhook Event Ingestion
router.post('/webhook', checkIdempotency, handleWebhook);

// Synthetic Event Simulator
router.post('/simulate', validateRequest(simulateEventSchema), checkIdempotency, handleSimulate);

// Recovery Cases Management
router.get('/cases', validateRequest(listCasesSchema), listCases);
router.get('/cases/:caseId', validateRequest(getCaseDetailsSchema), getCaseDetails);

export default router;
