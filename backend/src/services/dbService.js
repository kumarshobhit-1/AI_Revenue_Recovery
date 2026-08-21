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

export const dbService = {
  // Merchant Operations
  async findOrCreateMerchant(merchantData) {
    let merchant = await Merchant.findOne({ merchantId: merchantData.merchantId });
    if (!merchant) {
      merchant = await Merchant.create(merchantData);
    }
    return merchant;
  },

  // Customer Operations
  async findOrCreateCustomer(customerData) {
    let customer = await Customer.findOne({ customerId: customerData.customerId });
    if (!customer) {
      customer = await Customer.create(customerData);
    } else {
      // Update LTV and transaction counts if provided
      if (customerData.ltv !== undefined) customer.ltv = customerData.ltv;
      if (customerData.successfulTxnCount !== undefined) customer.successfulTxnCount = customerData.successfulTxnCount;
      if (customerData.failedTxnCount !== undefined) customer.failedTxnCount = customerData.failedTxnCount;
      await customer.save();
    }
    return customer;
  },

  // Payment Event Operations
  async createPaymentEvent(eventData) {
    return await PaymentEvent.create(eventData);
  },

  async getPaymentEventByIdempotencyKey(idempotencyKey) {
    return await PaymentEvent.findOne({ idempotencyKey });
  },

  // Recovery Case Operations
  async createRecoveryCase(caseData) {
    return await RecoveryCase.create(caseData);
  },

  async getRecoveryCaseById(caseId) {
    return await RecoveryCase.findOne({ caseId });
  },

  async getRecoveryCaseByPaymentId(paymentId) {
    return await RecoveryCase.findOne({ paymentId });
  },

  async updateCaseState(caseId, newState, summary, actor = 'SYSTEM', metadata = {}) {
    const existingCase = await RecoveryCase.findOne({ caseId });
    if (!existingCase) {
      throw new Error(`RecoveryCase with ID ${caseId} not found`);
    }

    const previousState = existingCase.state;
    existingCase.state = newState;
    await existingCase.save();

    // Automatically record an audit log entry on state transition
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
    return await AIDecision.create(decisionData);
  },

  // Policy Result Operations
  async savePolicyResult(policyData) {
    return await PolicyResult.create(policyData);
  },

  // Notification Operations
  async createNotification(notificationData) {
    return await Notification.create(notificationData);
  },

  // Audit Log Operations
  async appendAuditLog(auditData) {
    return await AuditLog.create(auditData);
  },

  async getAuditLogsByCaseId(caseId) {
    return await AuditLog.find({ caseId }).sort({ createdAt: 1 });
  },
};
