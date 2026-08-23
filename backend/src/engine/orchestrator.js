import { eventService } from '../services/eventService.js';
import { riskService } from '../services/riskService.js';
import { diagnosisService } from '../services/diagnosisService.js';
import { policyService } from '../services/policyService.js';
import { executeTool } from '../tools/index.js';

// RecoverAI Closed-Loop Recovery Orchestrator. Orchestrates the full lifecycle pipeline: Ingest (DETECTED) -> Risk Scoring (ELIGIBLE) -> AI Diagnosis (ACTION_PLANNED) -> Policy Validation -> Tool Execution (ACTION_SCHEDULED / ESCALATED / STOPPED).
export const orchestrateRecovery = async (rawPayload, customIdempotencyKey) => {
  const idempotencyKey = customIdempotencyKey || `idemp_orch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  // Step 1: Ingest payment failure event (State: DETECTED -> ANALYZING)
  const ingestion = await eventService.ingestPaymentFailure(rawPayload, idempotencyKey);
  const caseId = ingestion.recoveryCase.caseId;

  // Note: eventService already ran risk evaluation & diagnosis if eligible during ingestion.
  // Fetch current state of the case
  let currentCase = ingestion.recoveryCase;
  let riskResult = ingestion.riskResult;
  let diagnosisResult = ingestion.diagnosisResult;

  // Step 2 & 3: Ensure Risk & Diagnosis completed if case is still in ANALYZING
  if (currentCase.state === 'ANALYZING') {
    riskResult = await riskService.evaluateCaseRisk(caseId);
    currentCase = riskResult.recoveryCase || currentCase;
  }

  if (currentCase.state === 'ELIGIBLE') {
    diagnosisResult = await diagnosisService.diagnoseCase(caseId);
    currentCase = diagnosisResult.recoveryCase || currentCase;
  }

  // If case was stopped or escalated during risk check, return early
  if (['STOPPED', 'FAILED', 'ESCALATED'].includes(currentCase.state)) {
    return {
      success: true,
      caseId,
      finalState: currentCase.state,
      ingestion,
      riskResult,
      diagnosisResult: null,
      policyResult: null,
      toolResult: null,
    };
  }

  // Step 4: Policy Engine & Guardrail Validation
  const policyResult = await policyService.validateCasePolicy(caseId);
  const approvedAction = policyResult.verdict.finalAction;
  const delayMinutes = policyResult.verdict.finalDelayMinutes;
  const channel = policyResult.verdict.finalChannel;

  // Step 5: Execute Approved Bounded Tool Action
  const toolResult = await executeTool(approvedAction, caseId, {
    delayMinutes,
    channel,
    templateId: 'RECOVERY_LINK_DEFAULT',
  });

  return {
    success: true,
    caseId,
    finalState: toolResult.state || 'ACTION_SCHEDULED',
    approvedAction,
    ingestion,
    riskResult,
    diagnosisResult,
    policyResult,
    toolResult,
  };
};
