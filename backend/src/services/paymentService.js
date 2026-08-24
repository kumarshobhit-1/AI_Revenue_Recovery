import { dbService } from './dbService.js';
import { eventService } from './eventService.js';
import { policyService } from './policyService.js';
import { executeTool } from '../tools/index.js';
import { gatewaySimulator } from '../engine/gatewaySimulator.js';

export const paymentService = {
  // Initiates a realistic payment attempt lifecycle: INITIATED -> Gateway Simulator -> SUCCESS or FAILED.
  async createPaymentAttempt(payload) {
    const paymentId = payload.paymentId || `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const merchantId = payload.merchantId || 'mer_default';
    const customerId = payload.customerId || `cust_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const paymentMethod = (payload.paymentMethod || 'CARD').toUpperCase();

    // 1. Ensure Merchant exists
    const merchant = await dbService.findOrCreateMerchant({
      merchantId,
      name: 'Default Merchant Store',
      email: 'merchant@recoverai.dev',
      apiKey: 'key_dev_default',
    });

    // 2. Ensure Customer exists
    const customer = await dbService.findOrCreateCustomer({
      customerId,
      merchantId,
      name: payload.customerName || `Customer_${customerId.slice(-6).toUpperCase()}`,
      email: payload.customerEmail || `${customerId}@merchant-store.com`,
      phone: payload.customerPhone || '+919876543210',
      ltv: payload.customerLtv || 15000,
    });

    // 3. Create single Payment record in INITIATED state
    let payment = await dbService.createPayment({
      paymentId,
      merchantId,
      customerId,
      amount: payload.amount,
      currency: payload.currency || 'INR',
      paymentMethod,
      status: 'INITIATED',
    });

    // 4. Process transaction through Payment Gateway Simulator Engine
    const gatewayResult = await gatewaySimulator.processTransaction({
      paymentId,
      merchantId,
      customerId,
      amount: payload.amount,
      currency: payload.currency || 'INR',
      paymentMethod,
      simulateResult: payload.simulateResult,
      simulateErrorCode: payload.simulateErrorCode,
    });

    // 5. Handle SUCCESS Gateway Outcome
    if (gatewayResult.isSuccess) {
      payment = await dbService.updatePaymentStatus(paymentId, 'SUCCESS', {
        gatewayResponse: gatewayResult.gatewayResponse,
      });

      // Update customer stats
      customer.successfulTxnCount = (customer.successfulTxnCount || 0) + 1;
      customer.ltv = (customer.ltv || 0) + payload.amount;
      if (dbService.isDbConnected()) {
        await customer.save();
      }

      return {
        payment,
        gatewayResult,
        recoveryTriggered: false,
        recoveryCase: null,
      };
    }

    // 6. Handle FAILED Gateway Outcome -> Trigger Recovery Pipeline
    const failureReason = gatewayResult.failureReason || 'PAYMENT_FAILED';
    const errorCode = gatewayResult.errorCode || 'GATEWAY_DECLINED';

    payment = await dbService.updatePaymentStatus(paymentId, 'FAILED', {
      errorCode,
      failureReason,
      gatewayResponse: gatewayResult.gatewayResponse,
    });

    // Ingest failure into existing recovery pipeline (Reuses single Payment document)
    const ingestion = await eventService.ingestPaymentFailure(
      {
        paymentId,
        merchantId,
        customerId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        amount: payload.amount,
        currency: payload.currency || 'INR',
        failureReason,
        gatewayErrorCode: errorCode,
        rawPayload: gatewayResult.gatewayResponse,
      },
      `idemp_attempt_${paymentId}`
    );

    const caseId = ingestion.recoveryCase.caseId;
    let policyResult = null;
    let toolResult = null;

    // Run Policy Engine & Tool Execution for closed-loop recovery
    if (ingestion.recoveryCase.state === 'ACTION_PLANNED') {
      policyResult = await policyService.validateCasePolicy(caseId);
      const approvedAction = policyResult.verdict.finalAction;
      const delayMinutes = policyResult.verdict.finalDelayMinutes;
      const channel = policyResult.verdict.finalChannel;

      toolResult = await executeTool(approvedAction, caseId, {
        delayMinutes,
        channel,
        templateId: 'RECOVERY_LINK_DEFAULT',
      });
    }

    const finalCase = await dbService.getRecoveryCaseById(caseId);

    return {
      payment,
      gatewayResult,
      recoveryTriggered: true,
      recoveryCase: finalCase || ingestion.recoveryCase,
      riskResult: ingestion.riskResult,
      diagnosisResult: ingestion.diagnosisResult,
      policyResult,
      toolResult,
    };
  },

  async listPayments(query = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.merchantId) filter.merchantId = query.merchantId;
    if (query.customerId) filter.customerId = query.customerId;

    return await dbService.listPayments(filter, page, limit);
  },
};
