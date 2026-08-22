import { schedulePaymentRetryTool } from './scheduleRetryTool.js';
import { sendNotificationTool } from './sendNotificationTool.js';
import { generateRecoveryLinkTool } from './generateRecoveryLinkTool.js';
import { escalateCaseTool } from './escalateCaseTool.js';
import { stopWorkflowTool } from './stopWorkflowTool.js';

// Immutable Registry of Bounded Agent Tools. Maps recommended action strings to JavaScript tool executor functions.
export const toolRegistry = {
  SCHEDULE_RETRY: schedulePaymentRetryTool,
  SEND_NOTIFICATION: sendNotificationTool,
  GENERATE_RECOVERY_LINK: generateRecoveryLinkTool,
  ESCALATE_TO_MERCHANT: escalateCaseTool,
  STOP_WORKFLOW: stopWorkflowTool,
};

// Safe Execution Wrapper for Agent Tools.
export const executeTool = async (actionName, caseId, params = {}) => {
  const toolFn = toolRegistry[actionName];
  if (!toolFn) {
    throw new Error(`Invalid tool action '${actionName}'. Action not present in bounded tool registry.`);
  }

  return await toolFn({ caseId, ...params });
};

export {
  schedulePaymentRetryTool,
  sendNotificationTool,
  generateRecoveryLinkTool,
  escalateCaseTool,
  stopWorkflowTool,
};
