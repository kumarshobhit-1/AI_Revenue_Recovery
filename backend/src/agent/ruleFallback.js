import { validateAIDiagnosis } from './schemas/diagnosisSchema.js';

// Rule-Based Diagnostic Fallback Engine. Provides deterministic baseline root-cause analysis when LLM APIs are offline or return invalid JSON.
export const getRuleBasedDiagnosis = (context) => {
  const failureReason = (context.failureReason || 'GENERIC_FAILURE').toUpperCase();
  const amount = Number(context.amount) || 0;
  const previousAttempts = Number(context.previousAttempts) || 0;
  const ltv = Number(context.customer?.ltv) || 0;

  let classification = 'TEMPORARY_PAYMENT_FAILURE';
  let recommendedAction = 'SCHEDULE_RETRY';
  let suggestedDelayMinutes = 360;
  let suggestedChannel = null;
  let confidenceScore = 0.85;
  const rationale = [];

  if (failureReason === 'INSUFFICIENT_FUNDS') {
    classification = 'TEMPORARY_LIQUIDITY_ISSUE';
    suggestedDelayMinutes = 360; // 6 hours
    rationale.push('Failure caused by temporary lack of account balance.');
    rationale.push('Customer history indicates likelihood of successful retry after salary/pay credit window.');
  } else if (failureReason === 'BANK_SERVER_DOWN' || failureReason === 'NETWORK_TIMEOUT') {
    classification = 'GATEWAY_TECHNICAL_OUTAGE';
    suggestedDelayMinutes = 60; // 1 hour
    confidenceScore = 0.92;
    rationale.push('Failure caused by temporary bank server or gateway network glitch.');
    rationale.push('Fast retry recommended as technical issues usually resolve within 1 hour.');
  } else if (failureReason === 'EXPIRED_CARD' || failureReason === 'CARD_LIMIT_EXCEEDED') {
    classification = 'CARD_AUTHORIZATION_ISSUE';
    recommendedAction = 'SEND_NOTIFICATION';
    suggestedChannel = 'EMAIL';
    suggestedDelayMinutes = 0;
    rationale.push('Payment failed due to card expiration or limit reached.');
    rationale.push('Sending single-touch recovery notification with secure checkout link.');
  } else if (amount > 50000 && ltv > 100000) {
    classification = 'HIGH_VALUE_TRANSACTION_DECLINE';
    recommendedAction = 'ESCALATE_TO_MERCHANT';
    suggestedDelayMinutes = 0;
    confidenceScore = 0.75;
    rationale.push('High-value transaction decline requires merchant review.');
  } else if (previousAttempts >= 3) {
    classification = 'MAX_RETRIES_REACHED';
    recommendedAction = 'STOP_WORKFLOW';
    suggestedDelayMinutes = 0;
    rationale.push('Maximum retry limit reached for transaction.');
  } else {
    classification = 'TEMPORARY_CARD_DECLINE';
    suggestedDelayMinutes = 240;
    rationale.push('Standard decline code encountered.');
    rationale.push('Scheduling standard retry window.');
  }

  const rawDiagnosis = {
    classification,
    confidenceScore,
    recommendedAction,
    suggestedDelayMinutes,
    suggestedChannel,
    rationale,
  };

  return validateAIDiagnosis(rawDiagnosis);
};
