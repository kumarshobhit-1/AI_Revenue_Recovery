import mongoose from 'mongoose';
import {
  Merchant,
  Customer,
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
  paymentEvents: new Map(),
  recoveryCases: new Map(),
  aiDecisions: new Map(),
  policyResults: new Map(),
  notifications: new Map(),
  auditLogs: new Map(),
};

const isDbConnected = () => mongoose.connection.readyState === 1;

export const dbService = {
  // Merchant Operations
  async findOrCreateMerchant(merchantData) {
    if (isDbConnected()) {
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
    if (isDbConnected()) {
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

  // Payment Event Operations
  async createPaymentEvent(eventData) {
    if (isDbConnected()) {
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
    if (isDbConnected()) {
      return await PaymentEvent.findOne({ idempotencyKey });
    }
    return memoryStore.paymentEvents.get(idempotencyKey) || null;
  },

  // Recovery Case Operations
  async createRecoveryCase(caseData) {
    if (isDbConnected()) {
      return await RecoveryCase.create(caseData);
    }
    memoryStore.recoveryCases.set(caseData.caseId, { ...caseData });
    return caseData;
  },

  async getRecoveryCaseById(caseId) {
    if (isDbConnected()) {
      return await RecoveryCase.findOne({ caseId });
    }
    return memoryStore.recoveryCases.get(caseId) || null;
  },

  async getRecoveryCaseByPaymentId(paymentId) {
    if (isDbConnected()) {
      return await RecoveryCase.findOne({ paymentId });
    }
    for (const c of memoryStore.recoveryCases.values()) {
      if (c.paymentId === paymentId) return c;
    }
    return null;
  },

  async listRecoveryCases(filter = {}, page = 1, limit = 50) {
    if (isDbConnected()) {
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
    if (isDbConnected()) {
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
    if (isDbConnected()) {
      return await AIDecision.create(decisionData);
    }
    memoryStore.aiDecisions.set(decisionData.decisionId, decisionData);
    return decisionData;
  },

  // Policy Result Operations
  async savePolicyResult(policyData) {
    if (isDbConnected()) {
      return await PolicyResult.create(policyData);
    }
    memoryStore.policyResults.set(policyData.policyResultId, policyData);
    return policyData;
  },

  // Notification Operations
  async createNotification(notificationData) {
    if (isDbConnected()) {
      return await Notification.create(notificationData);
    }
    memoryStore.notifications.set(notificationData.notificationId, notificationData);
    return notificationData;
  },

  // Audit Log Operations
  async appendAuditLog(auditData) {
    if (isDbConnected()) {
      return await AuditLog.create(auditData);
    }
    const logs = memoryStore.auditLogs.get(auditData.caseId) || [];
    logs.push(auditData);
    memoryStore.auditLogs.set(auditData.caseId, logs);
    return auditData;
  },

  async getAuditLogsByCaseId(caseId) {
    if (isDbConnected()) {
      return await AuditLog.find({ caseId }).sort({ createdAt: 1 });
    }
    return memoryStore.auditLogs.get(caseId) || [];
  },
};
