import { validateAIDiagnosis } from './schemas/diagnosisSchema.js';

// Rule-Based Diagnostic Fallback Engine. Provides deterministic baseline root-cause analysis when LLM APIs are offline or return invalid JSON.
export const getRuleBasedDiagnosis = (context) => {
  const failureReason = (context.failureReason || 'GENERIC_FAILURE').toUpperCase();
  const gatewayCode = (context.gatewayErrorCode || '').toUpperCase();
  const fullText = `${failureReason} ${gatewayCode}`;
  const amount = Number(context.amount) || 0;
  const previousAttempts = Number(context.previousAttempts) || 0;
  const ltv = Number(context.customer?.ltv) || 0;

  let classification = 'TEMPORARY_PAYMENT_FAILURE';
  let recommendedAction = 'SCHEDULE_RETRY';
  let suggestedDelayMinutes = 360;
  let suggestedChannel = null;
  let confidenceScore = 0.88;
  const rationale = [];

  if (fullText.includes('ABANDONED') || fullText.includes('CHECKOUT_ABANDONED_SESSION')) {
    classification = 'CHECKOUT_ABANDONMENT';
    recommendedAction = 'GENERATE_RECOVERY_LINK';
    suggestedChannel = 'EMAIL';
    suggestedDelayMinutes = 30;
    confidenceScore = 0.88;
    rationale.push('Customer initiated checkout but abandoned session before completing payment.');
    rationale.push('Sending automated recovery link with reservation timer.');
  } else if (fullText.includes('MANDATE') || fullText.includes('RECURRING') || fullText.includes('SUBSCRIPTION')) {
    classification = 'SUBSCRIPTION_MANDATE_DECLINE';
    recommendedAction = 'SCHEDULE_RETRY';
    suggestedDelayMinutes = 720;
    confidenceScore = 0.82;
    rationale.push('Recurring subscription mandate auto-debit declined by issuing bank.');
    rationale.push('Scheduling secondary mandate debit execution window.');
  } else if (fullText.includes('OVERDUE') || fullText.includes('INVOICE') || fullText.includes('UNPAID')) {
    classification = 'OVERDUE_RECEIVABLE';
    recommendedAction = 'SEND_NOTIFICATION';
    suggestedChannel = 'WHATSAPP';
    suggestedDelayMinutes = 0;
    confidenceScore = 0.90;
    rationale.push('B2B receivable invoice has passed payment due date.');
    rationale.push('Dispatching automated WhatsApp reminder with direct payment portal link.');
  } else if (fullText.includes('DEGRADATION')) {
    classification = 'GATEWAY_DEGRADATION';
    recommendedAction = 'ESCALATE_TO_MERCHANT';
    suggestedDelayMinutes = 0;
    confidenceScore = 0.80;
    rationale.push('Consecutive payment degradation detected on current gateway route.');
    rationale.push('Escalating to merchant for payment routing inspection.');
  } else if (fullText.includes('PROMISE') || fullText.includes('PTP')) {
    classification = 'PROMISE_TO_PAY_COMMITMENT';
    recommendedAction = 'SCHEDULE_RETRY';
    suggestedDelayMinutes = 1440;
    confidenceScore = 0.95;
    rationale.push('Customer submitted Promise-to-Pay (PTP) date commitment.');
    rationale.push('Pausing aggressive retries until promised payment date.');
  } else if (fullText.includes('INSUFFICIENT') || fullText.includes('FUNDS')) {
    classification = 'TEMPORARY_LIQUIDITY_ISSUE';
    suggestedDelayMinutes = 360;
    confidenceScore = 0.85;
    rationale.push('Failure caused by temporary lack of account balance.');
    rationale.push('Customer history indicates likelihood of successful retry after salary/pay credit window.');
  } else if (fullText.includes('BANK_SERVER') || fullText.includes('TIMEOUT') || fullText.includes('NETWORK') || fullText.includes('504')) {
    classification = 'GATEWAY_TECHNICAL_OUTAGE';
    suggestedDelayMinutes = 60;
    confidenceScore = 0.92;
    rationale.push('Failure caused by temporary bank server or gateway network glitch.');
    rationale.push('Fast retry recommended as technical issues usually resolve within 1 hour.');
  } else if (fullText.includes('EXPIRED') || fullText.includes('AUTH_EXPIRED') || fullText.includes('LIMIT')) {
    classification = 'CARD_AUTHORIZATION_ISSUE';
    recommendedAction = 'SEND_NOTIFICATION';
    suggestedChannel = 'EMAIL';
    suggestedDelayMinutes = 0;
    confidenceScore = 0.85;
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
    confidenceScore = 0.85;
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
