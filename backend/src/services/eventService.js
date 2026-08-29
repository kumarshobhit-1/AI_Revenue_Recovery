import { dbService } from './dbService.js';
import { riskService } from './riskService.js';
import { diagnosisService } from './diagnosisService.js';
import { validateTransition } from '../engine/stateMachine.js';



export const normalizeEventPayload = (payload) => {
  if (payload.event === 'payment.failed' && payload.payload?.payment?.entity) {
    const p = payload.payload.payment.entity;
    return {
      paymentId: p.id,
      merchantId: payload.account_id || 'mer_default',
      customerId: p.customer_id || `cust_${p.contact || p.email || 'anon'}`,
      customerName: p.notes?.customer_name || 'Valued Customer',
      customerEmail: p.email || 'shobhitkumar1437@example.com',
      customerPhone: p.contact || '+917237810232',
      amount: Math.round(p.amount / 100), // Razorpay uses paise
      currency: p.currency || 'INR',
      failureReason: p.error_code || p.error_reason || 'PAYMENT_FAILED',
      gatewayErrorCode: p.error_code || 'GATEWAY_ERROR',
      rawPayload: payload,
    };
  }


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
  
  async ingestPaymentFailure(rawPayload, idempotencyKey, options = {}) {
    const norm = normalizeEventPayload(rawPayload);
    const isBenchmark = Boolean(options?.isBenchmark || rawPayload?.isBenchmark);

    const merchant = await dbService.findOrCreateMerchant({
      merchantId: norm.merchantId,
      name: 'Default Merchant Store',
      email: 'merchant@recoverai.dev',
      apiKey: 'key_dev_default',
    });

    const customer = await dbService.findOrCreateCustomer({
      customerId: norm.customerId,
      merchantId: norm.merchantId,
      name: norm.customerName,
      email: norm.customerEmail,
      phone: norm.customerPhone,
      ltv: norm.customerLtv || 10000,
      successfulTxnCount: norm.customerSuccessfulTxns || 3,
    });

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

    validateTransition('DETECTED', 'ANALYZING', caseId);
    await dbService.updateCaseState(
      caseId,
      'ANALYZING',
      'Case moved to ANALYZING stage for AI root-cause diagnosis & risk evaluation',
      'SYSTEM'
    );

    const riskResult = await riskService.evaluateCaseRisk(caseId);

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
