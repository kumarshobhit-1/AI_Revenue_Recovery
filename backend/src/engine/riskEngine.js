/**
 * Deterministic Failure Type Recoverability Weights.
 * Higher values (0.7 - 1.0) indicate temporary / highly recoverable failures.
 * Lower values (0.0 - 0.3) indicate permanent or unrecoverable failures.
 */
export const FAILURE_WEIGHTS = {
  INSUFFICIENT_FUNDS: 0.85,
  GATEWAY_DECLINE_TEMP: 0.90,
  BANK_SERVER_DOWN: 0.95,
  NETWORK_TIMEOUT: 0.95,
  UPI_PIN_TIMEOUT: 0.75,
  MANDATE_DEBIT_FAILED: 0.80,
  EXPIRED_CARD: 0.35,
  CARD_LIMIT_EXCEEDED: 0.60,
  STOLEN_CARD: 0.0,
  INVALID_ACCOUNT: 0.0,
  ACCOUNT_CLOSED: 0.0,
  AUTHENTICATION_FAILED: 0.50,
};

export const UNRECOVERABLE_REASONS = [
  'STOLEN_CARD',
  'INVALID_ACCOUNT',
  'ACCOUNT_CLOSED',
  'FRAUD_BLOCKED',
];

// Calculates Customer Lifetime Value Multiplier. Caps maximum multiplier at 2.5x to avoid extreme skew.
export const calculateLtvMultiplier = (ltv = 0) => {
  const normalizedLtv = Math.max(0, Number(ltv) || 0);
  return Math.min(2.5, 1.0 + normalizedLtv / 100000);
};

// Calculates Customer Historical Payment Success Ratio.
 export const calculateSuccessRatio = (successfulTxns = 0, failedTxns = 0) => {
  const success = Math.max(0, Number(successfulTxns) || 0);
  const failed = Math.max(0, Number(failedTxns) || 0);
  const total = success + failed;

  if (total === 0) return 0.70; // Default baseline for new customers with 0 history
  return success / total;
};

// Main Risk & Recovery Eligibility Engine.
export const evaluateRevenueRisk = ({ amount, failureReason, customer }) => {
  const transactionAmount = Number(amount) || 0;
  const reason = (failureReason || 'GENERIC_FAILURE').toUpperCase();

  // 1. Check hard unrecoverable failure rules
  if (UNRECOVERABLE_REASONS.includes(reason) || customer?.isOptedOut) {
    return {
      isEligible: false,
      recoveryProbability: 0.0,
      revenueAtRisk: 0,
      priority: 'NONE',
      rejectionReason: customer?.isOptedOut
        ? 'CUSTOMER_OPTED_OUT'
        : `PERMANENT_UNRECOVERABLE_FAILURE: ${reason}`,
    };
  }

  // 2. Compute weights and multipliers
  const failureWeight = FAILURE_WEIGHTS[reason] !== undefined ? FAILURE_WEIGHTS[reason] : 0.60;
  const ltvMultiplier = calculateLtvMultiplier(customer?.ltv);
  const successRatio = calculateSuccessRatio(customer?.successfulTxnCount, customer?.failedTxnCount);

  // 3. Compute baseline recovery probability (0.0 to 1.0)
  const recoveryProbability = Math.min(
    1.0,
    Math.max(0.0, successRatio * 0.5 + failureWeight * 0.5)
  );

  // 4. Calculate adjusted revenue at risk weighted by customer LTV multiplier
  const revenueAtRisk = Math.round(transactionAmount * ltvMultiplier);

  // 5. Determine priority tier
  let priority = 'MEDIUM';
  if (revenueAtRisk >= 25000 || recoveryProbability >= 0.85) {
    priority = 'HIGH';
  } else if (revenueAtRisk < 5000 || recoveryProbability < 0.40) {
    priority = 'LOW';
  }

  // Minimum probability cutoff for automated recovery eligibility
  const isEligible = recoveryProbability >= 0.20;

  return {
    isEligible,
    recoveryProbability: Number(recoveryProbability.toFixed(2)),
    revenueAtRisk,
    baseAmount: transactionAmount,
    ltvMultiplier: Number(ltvMultiplier.toFixed(2)),
    priority,
    rejectionReason: isEligible ? null : 'RECOVERY_PROBABILITY_BELOW_THRESHOLD',
  };
};
