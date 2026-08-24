import mongoose from 'mongoose';
import {
  Merchant,
  Customer,
  Payment,
  PaymentEvent,
  RecoveryCase,
  AIDecision,
  PolicyResult,
  Notification,
  AuditLog,
} from '../models/index.js';

// In-Memory fallback store for offline development / unit testing when MongoDB is not connected
const memoryStore = {
  merchants: new Map(),
  customers: new Map(),
  payments: new Map(),
  paymentEvents: new Map(),
  recoveryCases: new Map(),
  aiDecisions: new Map(),
  policyResults: new Map(),
  notifications: new Map(),
  auditLogs: new Map(),
};

const isDbConnected = () => mongoose.connection.readyState === 1;

const verifyPersistenceMode = () => {
  if (isDbConnected()) return true;
  if (process.env.NODE_ENV === 'test') return false;
  throw new Error('Database Connection Error: MongoDB is not connected. Application persistence requires an active MongoDB connection.');
};

export const dbService = {
  isDbConnected,
  verifyPersistenceMode,

  // Merchant Operations
  async findOrCreateMerchant(merchantData) {
    if (verifyPersistenceMode()) {
      let merchant = await Merchant.findOne({ merchantId: merchantData.merchantId });
      if (!merchant) {
        merchant = await Merchant.create(merchantData);
      }
      return merchant;
    }
    let merchant = memoryStore.merchants.get(merchantData.merchantId);
    if (!merchant) {
      merchant = { ...merchantData, policyLimits: merchantData.policyLimits || { maxRetries: 3 } };
      memoryStore.merchants.set(merchantData.merchantId, merchant);
    }
    return merchant;
  },

  // Customer Operations
  async findOrCreateCustomer(customerData) {
    if (verifyPersistenceMode()) {
      let customer = await Customer.findOne({ customerId: customerData.customerId });
      if (!customer) {
        customer = await Customer.create(customerData);
      } else {
        if (customerData.ltv !== undefined) customer.ltv = customerData.ltv;
        if (customerData.successfulTxnCount !== undefined) customer.successfulTxnCount = customerData.successfulTxnCount;
        if (customerData.failedTxnCount !== undefined) customer.failedTxnCount = customerData.failedTxnCount;
        await customer.save();
      }
      return customer;
    }
    let customer = memoryStore.customers.get(customerData.customerId);
    if (!customer) {
      customer = { ...customerData, isOptedOut: false };
      memoryStore.customers.set(customerData.customerId, customer);
    }
    return customer;
  },

  // Payment Operations (Phase 1)
  async createPayment(paymentData) {
    if (verifyPersistenceMode()) {
      return await Payment.create(paymentData);
    }
    if (memoryStore.payments.has(paymentData.paymentId)) {
      const err = new Error(`Duplicate paymentId: ${paymentData.paymentId}`);
      err.code = 11000;
      throw err;
    }
    const payment = { ...paymentData, createdAt: new Date(), updatedAt: new Date() };
    memoryStore.payments.set(paymentData.paymentId, payment);
    return payment;
  },

  async getPaymentById(paymentId) {
    if (verifyPersistenceMode()) {
      return await Payment.findOne({ paymentId });
    }
    return memoryStore.payments.get(paymentId) || null;
  },

  async updatePaymentStatus(paymentId, status, extraData = {}) {
    if (verifyPersistenceMode()) {
      const payment = await Payment.findOne({ paymentId });
      if (!payment) throw new Error(`Payment ${paymentId} not found`);
      payment.status = status;
      if (extraData.gatewayResponse) payment.gatewayResponse = extraData.gatewayResponse;
      if (extraData.errorCode) payment.errorCode = extraData.errorCode;
      if (extraData.failureReason) payment.failureReason = extraData.failureReason;
      await payment.save();
      return payment;
    }
    const payment = memoryStore.payments.get(paymentId);
    if (!payment) throw new Error(`Payment ${paymentId} not found`);
    payment.status = status;
    if (extraData.gatewayResponse) payment.gatewayResponse = extraData.gatewayResponse;
    if (extraData.errorCode) payment.errorCode = extraData.errorCode;
    if (extraData.failureReason) payment.failureReason = extraData.failureReason;
    payment.updatedAt = new Date();
    memoryStore.payments.set(paymentId, payment);
    return payment;
  },

  async listPayments(filter = {}, page = 1, limit = 50) {
    if (verifyPersistenceMode()) {
      const skip = (page - 1) * limit;
      const payments = await Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
      const total = await Payment.countDocuments(filter);
      return { payments, total };
    }
    let allPayments = Array.from(memoryStore.payments.values());
    if (filter.status) allPayments = allPayments.filter((p) => p.status === filter.status);
    if (filter.merchantId) allPayments = allPayments.filter((p) => p.merchantId === filter.merchantId);
    const total = allPayments.length;
    const skip = (page - 1) * limit;
    const payments = allPayments.slice(skip, skip + limit);
    return { payments, total };
  },

  // Payment Event Operations
  async createPaymentEvent(eventData) {
    if (verifyPersistenceMode()) {
      return await PaymentEvent.create(eventData);
    }
    if (memoryStore.paymentEvents.has(eventData.idempotencyKey)) {
      const err = new Error(`Duplicate idempotency key: ${eventData.idempotencyKey}`);
      err.code = 11000;
      throw err;
    }
    memoryStore.paymentEvents.set(eventData.idempotencyKey, eventData);
    return eventData;
  },

  async getPaymentEventByIdempotencyKey(idempotencyKey) {
    if (verifyPersistenceMode()) {
      return await PaymentEvent.findOne({ idempotencyKey });
    }
    return memoryStore.paymentEvents.get(idempotencyKey) || null;
  },

  // Recovery Case Operations
  async createRecoveryCase(caseData) {
    if (verifyPersistenceMode()) {
      return await RecoveryCase.create(caseData);
    }
    memoryStore.recoveryCases.set(caseData.caseId, { ...caseData });
    return caseData;
  },

  async getRecoveryCaseById(caseId) {
    if (verifyPersistenceMode()) {
      return await RecoveryCase.findOne({ caseId });
    }
    return memoryStore.recoveryCases.get(caseId) || null;
  },

  async getRecoveryCaseByPaymentId(paymentId) {
    if (verifyPersistenceMode()) {
      return await RecoveryCase.findOne({ paymentId });
    }
    for (const c of memoryStore.recoveryCases.values()) {
      if (c.paymentId === paymentId) return c;
    }
    return null;
  },

  async listRecoveryCases(filter = {}, page = 1, limit = 50) {
    if (verifyPersistenceMode()) {
      const skip = (page - 1) * limit;
      const cases = await RecoveryCase.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
      const total = await RecoveryCase.countDocuments(filter);
      return { cases, total };
    }

    let allCases = Array.from(memoryStore.recoveryCases.values());
    if (filter.state) {
      allCases = allCases.filter((c) => c.state === filter.state);
    }
    const total = allCases.length;
    const skip = (page - 1) * limit;
    const cases = allCases.slice(skip, skip + limit);
    return { cases, total };
  },

  async updateCaseState(caseId, newState, summary, actor = 'SYSTEM', metadata = {}) {
    if (verifyPersistenceMode()) {
      const existingCase = await RecoveryCase.findOne({ caseId });
      if (!existingCase) {
        throw new Error(`RecoveryCase with ID ${caseId} not found`);
      }

      const previousState = existingCase.state;
      existingCase.state = newState;
      await existingCase.save();

      await this.appendAuditLog({
        auditId: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        caseId,
        actor,
        eventType: 'STATE_TRANSITION',
        previousState,
        newState,
        summary,
        metadata,
      });

      return existingCase;
    }

    const existingCase = memoryStore.recoveryCases.get(caseId);
    if (!existingCase) {
      throw new Error(`RecoveryCase with ID ${caseId} not found`);
    }

    const previousState = existingCase.state;
    existingCase.state = newState;
    memoryStore.recoveryCases.set(caseId, existingCase);

    await this.appendAuditLog({
      auditId: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      caseId,
      actor,
      eventType: 'STATE_TRANSITION',
      previousState,
      newState,
      summary,
      metadata,
    });

    return existingCase;
  },

  // AI Decision Operations
  async saveAIDecision(decisionData) {
    if (verifyPersistenceMode()) {
      return await AIDecision.create(decisionData);
    }
    memoryStore.aiDecisions.set(decisionData.decisionId, decisionData);
    return decisionData;
  },

  async getAIDecisionByCaseId(caseId) {
    if (verifyPersistenceMode()) {
      return await AIDecision.findOne({ caseId }).sort({ createdAt: -1 });
    }
    for (const d of memoryStore.aiDecisions.values()) {
      if (d.caseId === caseId) return d;
    }
    return null;
  },

  // Policy Result Operations
  async savePolicyResult(policyData) {
    if (verifyPersistenceMode()) {
      return await PolicyResult.create(policyData);
    }
    memoryStore.policyResults.set(policyData.policyResultId, policyData);
    return policyData;
  },

  async getPolicyResultByCaseId(caseId) {
    if (verifyPersistenceMode()) {
      return await PolicyResult.findOne({ caseId }).sort({ createdAt: -1 });
    }
    for (const p of memoryStore.policyResults.values()) {
      if (p.caseId === caseId) return p;
    }
    return null;
  },

  // Notification Operations
  async createNotification(notificationData) {
    if (verifyPersistenceMode()) {
      return await Notification.create(notificationData);
    }
    memoryStore.notifications.set(notificationData.notificationId, notificationData);
    return notificationData;
  },

  // Audit Log Operations
  async appendAuditLog(auditData) {
    if (verifyPersistenceMode()) {
      return await AuditLog.create(auditData);
    }
    const logs = memoryStore.auditLogs.get(auditData.caseId) || [];
    logs.push(auditData);
    memoryStore.auditLogs.set(auditData.caseId, logs);
    return auditData;
  },

  async getAuditLogsByCaseId(caseId) {
    if (verifyPersistenceMode()) {
      return await AuditLog.find({ caseId }).sort({ createdAt: 1 });
    }
    return memoryStore.auditLogs.get(caseId) || [];
  },
};
