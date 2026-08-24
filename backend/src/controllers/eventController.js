import { eventService } from '../services/eventService.js';
import { dbService } from '../services/dbService.js';
import { outcomeService } from '../services/outcomeService.js';
import { fastForwardTime } from '../jobs/timeTravel.js';
import { getPendingMemoryJobs } from '../jobs/queue.js';
import { RecoveryCase } from '../models/RecoveryCase.js';
import { benchmarkEngine } from '../engine/benchmarkEngine.js';

export const handleWebhook = async (req, res, next) => {
  try {
    const result = await eventService.ingestPaymentFailure(req.body, req.idempotencyKey);
    res.status(202).json({
      success: true,
      message: 'Payment failure event ingested successfully',
      data: {
        eventId: result.paymentEvent.eventId,
        paymentId: result.paymentEvent.paymentId,
        caseId: result.recoveryCase.caseId,
        state: result.recoveryCase.state,
        revenueAtRisk: result.recoveryCase.revenueAtRisk,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleSimulate = async (req, res, next) => {
  try {
    const randId = Math.random().toString(36).substr(2, 6);
    const timeStamp = Date.now();

    const failureReasons = ['INSUFFICIENT_FUNDS', 'BANK_SERVER_DOWN', 'EXPIRED_CARD', 'GATEWAY_TIMEOUT', 'CARD_LIMIT_EXCEEDED'];
    const gatewayCodes = ['GATEWAY_DECLINE_TEMP', 'HDFC_TIMEOUT_504', 'CARD_AUTH_EXPIRED', 'ICICI_CONN_RESET', 'LIMIT_REACHED'];

    const randomIndex = Math.floor(Math.random() * failureReasons.length);

    const customerName = req.body?.customerName || `Customer_${randId.toUpperCase()}`;
    const customerEmail = req.body?.customerEmail || `user_${randId}@merchant-store.com`;
    const customerPhone = req.body?.customerPhone || `+919${Math.floor(100000000 + Math.random() * 900000000)}`;
    const customerLtv = req.body?.customerLtv || Math.floor(Math.random() * 150000) + 10000;
    const customerSuccessfulTxns = req.body?.customerSuccessfulTxns || Math.floor(Math.random() * 20) + 1;
    const amount = req.body?.amount || (Math.floor(Math.random() * 45) + 5) * 1000 + 999;
    const failureReason = req.body?.failureReason || failureReasons[randomIndex];
    const gatewayErrorCode = req.body?.gatewayErrorCode || gatewayCodes[randomIndex];

    const samplePayload = {
      paymentId: req.body?.paymentId || `pay_${timeStamp}_${randId}`,
      merchantId: req.body?.merchantId || 'mer_default',
      customerId: req.body?.customerId || `cust_${timeStamp}_${randId}`,
      customerName,
      customerEmail,
      customerPhone,
      customerLtv,
      customerSuccessfulTxns,
      amount,
      currency: req.body?.currency || 'INR',
      failureReason,
      gatewayErrorCode,
      idempotencyKey: req.body?.idempotencyKey || `sim_key_${timeStamp}_${randId}`,
    };

    const result = await eventService.ingestPaymentFailure(samplePayload, samplePayload.idempotencyKey);

    res.status(201).json({
      success: true,
      message: 'Synthetic payment failure ingested and orchestrated through AI pipeline',
      data: {
        eventId: result.paymentEvent.eventId,
        paymentId: result.paymentEvent.paymentId,
        caseId: result.recoveryCase.caseId,
        state: result.recoveryCase.state,
        amount: result.recoveryCase.amount,
        revenueAtRisk: result.recoveryCase.revenueAtRisk,
        customerName,
        customerEmail,
        failureReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listCases = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;

    const filter = {};
    if (req.query.state) filter.state = req.query.state;

    const { cases, total } = await dbService.listRecoveryCases(filter, page, limit);

    const enrichedCases = await Promise.all(
      cases.map(async (c) => {
        const rawCase = c._doc || c;
        const cust = await dbService.findOrCreateCustomer({ customerId: rawCase.customerId, merchantId: rawCase.merchantId });
        return {
          ...rawCase,
          customerName: cust.name || rawCase.customerId,
          customerEmail: cust.email || '',
          customerPhone: cust.phone || '',
          customerLtv: cust.ltv || 0,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        cases: enrichedCases,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCaseDetails = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const recoveryCase = await dbService.getRecoveryCaseById(caseId);

    if (!recoveryCase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Case ${caseId} not found` },
      });
    }

    const rawCase = recoveryCase._doc || recoveryCase;
    const customer = await dbService.findOrCreateCustomer({
      customerId: rawCase.customerId,
      merchantId: rawCase.merchantId,
    });

    const payment = await dbService.getPaymentById(rawCase.paymentId);
    const aiDecision = await dbService.getAIDecisionByCaseId(caseId);
    const policyResult = await dbService.getPolicyResultByCaseId(caseId);
    const auditLogs = await dbService.getAuditLogsByCaseId(caseId);

    res.status(200).json({
      success: true,
      data: {
        recoveryCase: {
          ...rawCase,
          customerName: customer.name || rawCase.customerId,
          customerEmail: customer.email || '',
          customerPhone: customer.phone || '',
          customerLtv: customer.ltv || 0,
        },
        payment: payment ? (payment._doc || payment) : null,
        aiDecision: aiDecision ? (aiDecision._doc || aiDecision) : null,
        policyResult: policyResult ? (policyResult._doc || policyResult) : null,
        auditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resolveCaseOutcome = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { outcome = 'SUCCESS', notes = '' } = req.body;

    const result = await outcomeService.resolveOutcome(caseId, outcome, notes);

    res.status(200).json({
      success: true,
      message: `Case ${caseId} outcome resolved to ${result.outcome}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMetrics = async (req, res, next) => {
  try {
    const merchantId = req.query.merchantId || 'mer_default';
    const metrics = await outcomeService.getBatchRecoveryMetrics(merchantId);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

export const handleFastForward = async (req, res, next) => {
  try {
    const { caseId, targetMinutes = 360 } = req.body || {};
    const result = await fastForwardTime({ caseId, targetMinutes });

    res.status(200).json({
      success: true,
      message: `Time-travel fast-forward completed. ${result.jobsExecutedCount} retry jobs executed.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listPendingJobs = async (req, res, next) => {
  try {
    const jobs = getPendingMemoryJobs();
    res.status(200).json({
      success: true,
      data: {
        jobs,
        total: jobs.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleBenchmark = async (req, res, next) => {
  try {
    const batchSize = Number(req.body?.batchSize) || 20;
    const merchantId = req.body?.merchantId || 'mer_default';

    const result = await benchmarkEngine.runBatchBenchmark(batchSize, merchantId);

    res.status(200).json({
      success: true,
      message: `Batch synthetic benchmark evaluation completed for ${batchSize} cases.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
