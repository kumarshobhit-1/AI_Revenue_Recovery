import { eventService } from '../services/eventService.js';
import { dbService } from '../services/dbService.js';
import { RecoveryCase } from '../models/RecoveryCase.js';

export const handleWebhook = async (req, res, next) => {
  try {
    const result = await eventService.ingestPaymentFailure(req.body, req.idempotencyKey);
    res.status(201).json({
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
    const samplePayload = {
      paymentId: req.body.paymentId || `pay_sim_${Date.now()}`,
      merchantId: req.body.merchantId || 'mer_default',
      customerId: req.body.customerId || `cust_sim_${Date.now()}`,
      customerName: req.body.customerName || 'Aarav Sharma',
      customerEmail: req.body.customerEmail || 'aarav.sharma@example.com',
      customerPhone: req.body.customerPhone || '+919876543210',
      customerLtv: req.body.customerLtv || 42000,
      customerSuccessfulTxns: req.body.customerSuccessfulTxns || 12,
      amount: req.body.amount || 4999,
      currency: req.body.currency || 'INR',
      failureReason: req.body.failureReason || 'INSUFFICIENT_FUNDS',
      gatewayErrorCode: req.body.gatewayErrorCode || 'GATEWAY_DECLINE_TEMP',
      idempotencyKey: req.body.idempotencyKey || `sim_key_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };

    const result = await eventService.ingestPaymentFailure(samplePayload, samplePayload.idempotencyKey);
    res.status(201).json({
      success: true,
      message: 'Synthetic payment failure simulated successfully',
      data: {
        eventId: result.paymentEvent.eventId,
        paymentId: result.paymentEvent.paymentId,
        caseId: result.recoveryCase.caseId,
        state: result.recoveryCase.state,
        revenueAtRisk: result.recoveryCase.revenueAtRisk,
        customer: {
          name: result.customer.name,
          email: result.customer.email,
          ltv: result.customer.ltv,
        },
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

    res.status(200).json({
      success: true,
      data: {
        cases,
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

    const auditLogs = await dbService.getAuditLogsByCaseId(caseId);

    res.status(200).json({
      success: true,
      data: {
        recoveryCase,
        auditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};
