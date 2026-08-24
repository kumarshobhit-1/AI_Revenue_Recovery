import express from 'express';
import { validateRequest } from '../middleware/validate.js';
import { createPaymentAttemptSchema, listPaymentsSchema } from '../validators/paymentValidators.js';
import { paymentController } from '../controllers/paymentController.js';

const router = express.Router();

// POST /api/payments/attempt - Initiates a realistic payment attempt
router.post('/attempt', validateRequest(createPaymentAttemptSchema), paymentController.handleAttempt);

// GET /api/payments - Returns paginated payment records
router.get('/', validateRequest(listPaymentsSchema), paymentController.handleList);

export default router;
