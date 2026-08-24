export const GATEWAY_DECLINE_CODES = {
  CARD: {
    INSUFFICIENT_FUNDS: {
      code: 'INSUFFICIENT_FUNDS',
      responseCode: '402_PAYMENT_REQUIRED',
      reason: 'Customer account has insufficient funds for transaction',
    },
    EXPIRED_CARD: {
      code: 'EXPIRED_CARD',
      responseCode: '400_BAD_REQUEST',
      reason: 'Payment card has expired',
    },
    CARD_BLOCKED: {
      code: 'CARD_BLOCKED',
      responseCode: '403_FORBIDDEN',
      reason: 'Payment card is blocked by issuing bank',
    },
    BANK_TIMEOUT: {
      code: 'BANK_TIMEOUT',
      responseCode: '504_GATEWAY_TIMEOUT',
      reason: 'Issuing bank gateway failed to respond within timeout window',
    },
  },
  UPI: {
    UPI_TIMEOUT: {
      code: 'UPI_TIMEOUT',
      responseCode: '504_GATEWAY_TIMEOUT',
      reason: 'UPI transaction timed out waiting for MPIN authorization',
    },
    BANK_UNAVAILABLE: {
      code: 'BANK_UNAVAILABLE',
      responseCode: '503_SERVICE_UNAVAILABLE',
      reason: 'Remitter bank server is currently unavailable',
    },
    AUTHENTICATION_FAILED: {
      code: 'AUTHENTICATION_FAILED',
      responseCode: '401_UNAUTHORIZED',
      reason: 'UPI MPIN authentication failed',
    },
  },
  NETBANKING: {
    BANK_TIMEOUT: {
      code: 'BANK_TIMEOUT',
      responseCode: '504_GATEWAY_TIMEOUT',
      reason: 'NetBanking session timed out during authentication',
    },
    BANK_UNAVAILABLE: {
      code: 'BANK_UNAVAILABLE',
      responseCode: '503_SERVICE_UNAVAILABLE',
      reason: 'Core banking portal is undergoing scheduled maintenance',
    },
  },
  MANDATE: {
    MANDATE_REJECTED: {
      code: 'MANDATE_REJECTED',
      responseCode: '400_BAD_REQUEST',
      reason: 'Recurring e-mandate execution rejected by customer bank',
    },
    AUTHORIZATION_FAILED: {
      code: 'AUTHORIZATION_FAILED',
      responseCode: '403_FORBIDDEN',
      reason: 'Auto-debit mandate authorization revoked by customer',
    },
  },
};

export const gatewaySimulator = {
  // Processes a transaction and returns realistic payment gateway response metadata
  async processTransaction(transactionData) {
    const method = (transactionData.paymentMethod || 'CARD').toUpperCase();
    const allowedMethods = ['CARD', 'UPI', 'NETBANKING', 'MANDATE'];

    if (!allowedMethods.includes(method)) {
      throw new Error(`Unsupported payment method: ${method}. Supported methods: ${allowedMethods.join(', ')}`);
    }

    const latencyMs = Math.floor(Math.random() * 250) + 120; // 120ms - 370ms latency
    const gatewayTxnId = `gtw_${method.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Check for deterministic test controls (optional overrides for automated tests)
    let isSuccess = false;

    if (transactionData.simulateResult === 'SUCCESS') {
      isSuccess = true;
    } else if (transactionData.simulateResult === 'FAILED') {
      isSuccess = false;
    } else {
      // Production / realistic simulation: 75% success rate, 25% failure
      isSuccess = Math.random() >= 0.25;
    }

    if (isSuccess) {
      return {
        isSuccess: true,
        errorCode: null,
        failureReason: null,
        gatewayResponse: {
          gatewayTxnId,
          status: 'CAPTURED',
          responseCode: '200_SUCCESS',
          paymentMethod: method,
          currency: transactionData.currency || 'INR',
          amount: transactionData.amount,
          processedAt: new Date().toISOString(),
          latencyMs,
          gatewayRefNumber: `ref_${Date.now()}`,
        },
      };
    }

    // Handle Failure Outcome
    const methodDeclines = GATEWAY_DECLINE_CODES[method];
    let declineInfo = null;

    if (transactionData.simulateErrorCode && methodDeclines[transactionData.simulateErrorCode]) {
      declineInfo = methodDeclines[transactionData.simulateErrorCode];
    } else {
      // Select random decline code for the specified payment method
      const keys = Object.keys(methodDeclines);
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      declineInfo = methodDeclines[randomKey];
    }

    return {
      isSuccess: false,
      errorCode: declineInfo.code,
      failureReason: declineInfo.reason,
      gatewayResponse: {
        gatewayTxnId,
        status: 'DECLINED',
        responseCode: declineInfo.responseCode,
        errorCode: declineInfo.code,
        failureReason: declineInfo.reason,
        paymentMethod: method,
        currency: transactionData.currency || 'INR',
        amount: transactionData.amount,
        processedAt: new Date().toISOString(),
        latencyMs,
        gatewayRefNumber: `err_${Date.now()}`,
      },
    };
  },
};
