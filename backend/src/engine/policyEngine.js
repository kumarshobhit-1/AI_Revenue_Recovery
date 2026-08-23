//Deterministic Zero-Trust Policy Engine & Financial Guardrails. Pure function evaluating AI recommendations against strict business rules.

export const evaluatePolicy = ({ caseData, customer, notificationCount = 0, merchantLimits = {} }, aiDecision) => {
  const maxRetries = merchantLimits.maxRetries || 3;
  const highValueThreshold = merchantLimits.highValueThresholdAmount || 50000;
  const minRetryDelay = merchantLimits.minRetryDelayMinutes || 240; // 4 hours minimum delay

  const violatedRules = [];
  const appliedOverrides = {};

  let finalAction = aiDecision.recommendedAction;
  let finalDelayMinutes = aiDecision.suggestedDelayMinutes || 360;
  let finalChannel = aiDecision.suggestedChannel || null;
  let status = 'APPROVED';

  // Guardrail Rule 1: Payment Already Recovered
  if (caseData.recoveredAmount > 0 || caseData.state === 'RECOVERED') {
    violatedRules.push('PAYMENT_ALREADY_RECOVERED');
    finalAction = 'STOP_WORKFLOW';
    appliedOverrides.reason = 'Payment has already been successfully recovered';
  }

  // Guardrail Rule 2: Customer Opt-Out Enforcer
  else if (customer?.isOptedOut) {
    violatedRules.push('CUSTOMER_OPTED_OUT');
    finalAction = 'STOP_WORKFLOW';
    appliedOverrides.reason = 'Customer has opted out of automated communications';
  }

  // Guardrail Rule 3: Max Retries Exceeded
  else if (caseData.retryCount >= maxRetries && aiDecision.recommendedAction === 'SCHEDULE_RETRY') {
    violatedRules.push('MAX_RETRIES_EXCEEDED');
    finalAction = 'STOP_WORKFLOW';
    appliedOverrides.reason = `Maximum retry attempt limit (${maxRetries}) reached for case`;
  }

  // Guardrail Rule 4: High-Value Low-Confidence Escrow
  else if (caseData.amount >= highValueThreshold && aiDecision.confidenceScore < 0.75) {
    violatedRules.push('HIGH_VALUE_LOW_CONFIDENCE');
    finalAction = 'ESCALATE_TO_MERCHANT';
    appliedOverrides.reason = `High-value transaction (${caseData.currency} ${caseData.amount}) with low AI confidence (${(aiDecision.confidenceScore * 100).toFixed(0)}%) requires manual merchant authorization`;
  }

  // Guardrail Rule 5: Single-Touch Notification Limit
  else if (notificationCount >= 1 && aiDecision.recommendedAction === 'SEND_NOTIFICATION') {
    violatedRules.push('SINGLE_TOUCH_NOTIFICATION_CAP');
    finalAction = 'ESCALATE_TO_MERCHANT';
    appliedOverrides.reason = 'Single-touch notification limit reached. Multiple message spam prevented.';
  }

  // Guardrail Rule 6: Minimum Retry Delay Enforcement
  if (finalAction === 'SCHEDULE_RETRY' && finalDelayMinutes < minRetryDelay) {
    violatedRules.push('MIN_RETRY_DELAY_VIOLATION');
    appliedOverrides.originalDelayMinutes = finalDelayMinutes;
    finalDelayMinutes = minRetryDelay;
    appliedOverrides.enforcedDelayMinutes = minRetryDelay;
  }

  // Determine overall verdict status
  if (violatedRules.length > 0) {
    status = finalAction !== aiDecision.recommendedAction ? 'MODIFIED' : 'APPROVED';
    if (finalAction === 'STOP_WORKFLOW' && aiDecision.recommendedAction !== 'STOP_WORKFLOW') {
      status = 'REJECTED';
    }
  }

  return {
    status,
    originalAction: aiDecision.recommendedAction,
    finalAction,
    originalDelayMinutes: aiDecision.suggestedDelayMinutes,
    finalDelayMinutes,
    finalChannel,
    violatedRules,
    appliedOverrides,
  };
};
