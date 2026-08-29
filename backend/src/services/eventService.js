import { dbService } from './dbService.js';
import { riskService } from './riskService.js';
import { diagnosisService } from './diagnosisService.js';
import { validateTransition } from '../engine/stateMachine.js';



// Normalizes inbound payment failure payloads from Razorpay or generic gateways.
export const normalizeEventPayload = (payload) => {
  // Support Razorpay Webhook format if present
  if (payload.event === 'payment.failed' && payload.payload?.payment?.entity) {
    const p = payload.payload.payment.entity;
    return {
      paymentId: p.id,
      merchantId: payload.account_id || 'mer_default',
      customerId: p.customer_id || `cust_${p.contact || p.email || 'anon'}`,
      customerName: p.notes?.customer_name || 'Valued Customer',
      customerEmail: p.email || 'customer@example.com',
      customerPhone: p.contact || '+919999999999',
      amount: Math.round(p.amount / 100), // Razorpay uses paise
      currency: p.currency || 'INR',
      failureReason: p.error_code || p.error_reason || 'PAYMENT_FAILED',
      gatewayErrorCode: p.error_code || 'GATEWAY_ERROR',
      rawPayload: payload,
    };
  }

  // Generic / Synthetic Event Payload format
  return {
    paymentId: payload.paymentId || payload.payment_id || `pay_${Date.now()}`,
    merchantId: payload.merchantId || payload.merchant_id || 'mer_default',
    customerId: payload.customerId || payload.customer_id || `cust_${Date.now()}`,
    customerName: payload.customerName || payload.customer?.name || 'Customer',
    customerEmail: payload.customerEmail || payload.customer?.email || 'customer@example.com',
    customerPhone: payload.customerPhone || payload.customer?.phone || '+919876543210',
    customerLtv: payload.customerLtv || payload.customer?.ltv || 0,
    customerSuccessfulTxns: payload.customerSuccessfulTxns || payload.customer?.successfulTxns || 0,
    amount: Number(payload.amount) || 1000,
    currency: payload.currency || 'INR',
    failureReason: payload.failureReason || payload.failure_reason || 'INSUFFICIENT_FUNDS',
    gatewayErrorCode: payload.gatewayErrorCode || 'DECLINED',
    rawPayload: payload,
  };
};

export const eventService = {
  // Main entry point for ingesting failed payment events.
  
  async ingestPaymentFailure(rawPayload, idempotencyKey, options = {}) {
    const norm = normalizeEventPayload(rawPayload);
    const isBenchmark = Boolean(options?.isBenchmark || rawPayload?.isBenchmark);

    // 1. Ensure Merchant exists
    const merchant = await dbService.findOrCreateMerchant({
      merchantId: norm.merchantId,
      name: 'Default Merchant Store',
      email: 'merchant@recoverai.dev',
      apiKey: 'key_dev_default',
    });

    // 2. Ensure Customer exists
    const customer = await dbService.findOrCreateCustomer({
      customerId: norm.customerId,
      merchantId: norm.merchantId,
      name: norm.customerName,
      email: norm.customerEmail,
      phone: norm.customerPhone,
      ltv: norm.customerLtv || 10000,
      successfulTxnCount: norm.customerSuccessfulTxns || 3,
    });

    // 2b. Reuse or create Payment entity (Single payment document guarantee)
    let payment = await dbService.getPaymentById(norm.paymentId);
    if (!payment) {
      payment = await dbService.createPayment({
        paymentId: norm.paymentId,
        merchantId: norm.merchantId,
        customerId: norm.customerId,
        amount: norm.amount,
        currency: norm.currency,
        paymentMethod: norm.paymentMethod || 'CARD',
        status: 'FAILED',
        errorCode: norm.gatewayErrorCode,
        failureReason: norm.failureReason,
        gatewayResponse: norm.rawPayload,
      });
    } else {
      payment = await dbService.updatePaymentStatus(norm.paymentId, 'FAILED', {
        errorCode: norm.gatewayErrorCode,
        failureReason: norm.failureReason,
        gatewayResponse: norm.rawPayload,
      });
    }

    // 3. Save Payment Event
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const paymentEvent = await dbService.createPaymentEvent({
      eventId,
      paymentId: norm.paymentId,
      merchantId: norm.merchantId,
      customerId: norm.customerId,
      amount: norm.amount,
      currency: norm.currency,
      failureReason: norm.failureReason,
      gatewayErrorCode: norm.gatewayErrorCode,
      rawPayload: norm.rawPayload,
      idempotencyKey,
    });

    // 4. Initialize Recovery Case in DETECTED state
    const caseId = `case_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const recoveryCase = await dbService.createRecoveryCase({
      caseId,
      paymentId: norm.paymentId,
      customerId: norm.customerId,
      merchantId: norm.merchantId,
      amount: norm.amount,
      currency: norm.currency,
      state: 'DETECTED',
      revenueAtRisk: norm.amount,
      recoveredAmount: 0,
      retryCount: 0,
      failureCategory: norm.failureReason,
    });

    // Initial audit log entry
    await dbService.appendAuditLog({
      auditId: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      caseId,
      actor: 'SYSTEM',
      eventType: 'EVENT_INGESTED',
      previousState: null,
      newState: 'DETECTED',
      summary: `Failed payment of ${norm.currency} ${norm.amount} ingested. Reason: ${norm.failureReason}`,
      metadata: { paymentId: norm.paymentId, idempotencyKey },
    });

    // 5. Advance State Machine: DETECTED -> ANALYZING
    validateTransition('DETECTED', 'ANALYZING', caseId);
    await dbService.updateCaseState(
      caseId,
      'ANALYZING',
      'Case moved to ANALYZING stage for AI root-cause diagnosis & risk evaluation',
      'SYSTEM'
    );

    // 6. Run Revenue-at-Risk & Recovery Eligibility Engine (ANALYZING -> ELIGIBLE)
    const riskResult = await riskService.evaluateCaseRisk(caseId);

    // 7. If eligible, trigger AI Failure Diagnosis (ELIGIBLE -> ACTION_PLANNED)
    let diagnosisResult = null;
    if (riskResult.isEligible) {
      diagnosisResult = await diagnosisService.diagnoseCase(caseId, { ...options, isBenchmark });
    }

    const finalCase = await dbService.getRecoveryCaseById(caseId);

    return {
      paymentEvent,
      recoveryCase: finalCase,
      customer,
      merchant,
      riskResult,
      diagnosisResult,
    };
  },
};
