import { dbService } from '../services/dbService.js';
import { validateTransition } from '../engine/stateMachine.js';

/**
 * Bounded Tool: Generate Recovery Checkout Link
 * Creates a secure, single-use checkout completion URL for the customer.
 */
export const generateRecoveryLinkTool = async ({ caseId, expiryHours = 24 }) => {
  const recoveryCase = await dbService.getRecoveryCaseById(caseId);
  if (!recoveryCase) {
    throw new Error(`Case ${caseId} not found for generating recovery link`);
  }

  const hours = Math.max(1, Number(expiryHours) || 24);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const token = `rec_token_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const recoveryUrl = `https://checkout.recoverai.dev/pay?token=${token}&case=${caseId}`;

  // Validate state transition ACTION_PLANNED -> ACTION_SCHEDULED
  validateTransition(recoveryCase.state, 'ACTION_SCHEDULED', caseId);

  await dbService.updateCaseState(
    caseId,
    'ACTION_SCHEDULED',
    `Secure single-use recovery link generated (Expires at ${expiresAt.toISOString()}). URL: ${recoveryUrl}`,
    'AI_AGENT',
    { recoveryUrl, token, expiresAt }
  );

  return {
    success: true,
    toolName: 'generate_recovery_link',
    caseId,
    recoveryUrl,
    token,
    expiresAt,
  };
};
