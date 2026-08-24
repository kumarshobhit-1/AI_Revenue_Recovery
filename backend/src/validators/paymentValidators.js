import { z } from 'zod';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../models/Payment.js';

export const createPaymentAttemptSchema = z.object({
  body: z.object({
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().email('Invalid customer email address').optional(),
    customerPhone: z.string().optional(),
    customerLtv: z.number().min(0).optional(),
    amount: z.number({ required_error: 'Amount is required' }).min(1, 'Amount must be at least 1'),
    currency: z.string().default('INR'),
    paymentMethod: z.enum(PAYMENT_METHODS, {
      invalid_type_error: `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`,
    }).default('CARD'),
    merchantId: z.string().default('mer_default'),
    simulateResult: z.enum(['SUCCESS', 'FAILED', 'RANDOM']).default('RANDOM'),
    simulateErrorCode: z.string().optional(),
    simulateFailureReason: z.string().optional(),
  }),
});

export const listPaymentsSchema = z.object({
  query: z.object({
    status: z.enum(PAYMENT_STATUSES).optional(),
    merchantId: z.string().optional(),
    customerId: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});
