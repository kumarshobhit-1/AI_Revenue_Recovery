import crypto from 'crypto';
import { dbService } from '../services/dbService.js';

// Computes a deterministic idempotency key if not explicitly provided in headers/body.
export const generateIdempotencyKey = (payload) => {
  if (payload.idempotencyKey) return payload.idempotencyKey;
  if (payload.event_id) return payload.event_id;

  const paymentId = payload.paymentId || payload.payment_id || payload.payload?.payment?.entity?.id || 'unknown';
  const failureReason = payload.failureReason || payload.failure_reason || payload.payload?.payment?.entity?.error_code || 'generic';
  
  // Use a 5-minute time window for hash calculation if timestamp missing
  const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000));
  const rawString = `${paymentId}:${failureReason}:${timeWindow}`;

  return `idemp_${crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 16)}`;
};

// Express middleware to prevent duplicate payment event ingestion.
export const checkIdempotency = async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'] || generateIdempotencyKey(req.body);
    req.idempotencyKey = idempotencyKey;

    const existingEvent = await dbService.getPaymentEventByIdempotencyKey(idempotencyKey);
    if (existingEvent) {
      const existingCase = await dbService.getRecoveryCaseByPaymentId(existingEvent.paymentId);
      return res.status(200).json({
        success: true,
        duplicated: true,
        message: 'Payment event already ingested and processed',
        data: {
          eventId: existingEvent.eventId,
          paymentId: existingEvent.paymentId,
          caseId: existingCase ? existingCase.caseId : null,
          state: existingCase ? existingCase.state : 'DETECTED',
        },
      });
    }

    next();
  } catch (error) {
    console.error('[Idempotency Middleware Error]:', error);
    next(error);
  }
};
