import { z } from 'zod';
import { RECOVERY_CASE_STATES } from '../models/RecoveryCase.js';

export const getCaseDetailsSchema = z.object({
  params: z.object({
    caseId: z.string().min(1, 'caseId parameter is required'),
  }),
});

export const listCasesSchema = z.object({
  query: z.object({
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    state: z.enum(RECOVERY_CASE_STATES).optional(),
  }),
});

export const simulateEventSchema = z.object({
  body: z.object({
    paymentId: z.string().optional(),
    merchantId: z.string().optional(),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().email('Invalid customer email address').optional(),
    customerPhone: z.string().optional(),
    amount: z.number().positive('Amount must be greater than 0').optional(),
    currency: z.string().optional(),
    failureReason: z.string().optional(),
    gatewayErrorCode: z.string().optional(),
    idempotencyKey: z.string().optional(),
  }).optional(),
});
