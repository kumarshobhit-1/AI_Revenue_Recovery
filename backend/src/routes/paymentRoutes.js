import express from 'express';
import { validateRequest } from '../middleware/validate.js';
import { authenticateMerchant } from '../middleware/auth.js';
import { createPaymentAttemptSchema, listPaymentsSchema } from '../validators/paymentValidators.js';
import { paymentController } from '../controllers/paymentController.js';

const router = express.Router();

// POST /api/payments/attempt - Initiates a realistic payment attempt with authentication & validation
router.post('/attempt', authenticateMerchant, validateRequest(createPaymentAttemptSchema), paymentController.handleAttempt);

// GET /api/payments - Returns paginated payment records with authentication & validation
router.get('/', authenticateMerchant, validateRequest(listPaymentsSchema), paymentController.handleList);

export default router;
