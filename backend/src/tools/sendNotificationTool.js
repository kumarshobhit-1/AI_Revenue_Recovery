import { dbService } from '../services/dbService.js';
import { validateTransition } from '../engine/stateMachine.js';

// Bounded Tool: Send Single-Touch Recovery Notification Simulates Email, SMS, or WhatsApp recovery messaging with opt-out enforcement.
export const sendNotificationTool = async ({ caseId, channel = 'EMAIL', templateId = 'RECOVERY_LINK_DEFAULT' }) => {
  const recoveryCase = await dbService.getRecoveryCaseById(caseId);
  if (!recoveryCase) {
    throw new Error(`Case ${caseId} not found for sending notification`);
  }

  const customer = await dbService.findOrCreateCustomer({
    customerId: recoveryCase.customerId,
    merchantId: recoveryCase.merchantId,
  });

  // Opt-out Safety Enforcement
  if (customer.isOptedOut) {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    await dbService.createNotification({
      notificationId: notifId,
      caseId,
      customerId: customer.customerId,
      channel: channel.toUpperCase(),
      status: 'OPTED_OUT',
      messageBody: `[BLOCKED] Recovery notification suppressed because customer ${customer.customerId} is opted out.`,
    });

    return {
      success: false,
      reason: 'CUSTOMER_OPTED_OUT',
      channel,
      status: 'OPTED_OUT',
    };
  }

  const validChannel = ['EMAIL', 'SMS', 'WHATSAPP'].includes(channel.toUpperCase()) ? channel.toUpperCase() : 'EMAIL';
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const recoveryUrl = `https://pay.recoverai.dev/r/${caseId}`;

  const messageBody = `[RecoverAI ${validChannel}] Dear ${customer.name || 'Customer'}, your transaction of ${recoveryCase.currency} ${recoveryCase.amount} was incomplete. Click here to safely complete payment: ${recoveryUrl}`;

  // Persist Notification document
  const notification = await dbService.createNotification({
    notificationId,
    caseId,
    customerId: customer.customerId,
    channel: validChannel,
    status: 'SENT',
    messageBody,
    deliveredAt: new Date(),
  });

  // Validate state transition ACTION_PLANNED -> ACTION_SCHEDULED
  validateTransition(recoveryCase.state, 'ACTION_SCHEDULED', caseId);

  await dbService.updateCaseState(
    caseId,
    'ACTION_SCHEDULED',
    `Simulated ${validChannel} recovery notification sent to customer ${customer.email || customer.phone || customer.customerId}. Template: ${templateId}`,
    'AI_AGENT',
    { notificationId, channel: validChannel, templateId }
  );

  return {
    success: true,
    toolName: 'send_recovery_notification',
    caseId,
    notificationId,
    channel: validChannel,
    recipient: customer.email || customer.phone || customer.customerId,
    recoveryUrl,
  };
};
