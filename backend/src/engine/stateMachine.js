import { RECOVERY_CASE_STATES } from '../models/RecoveryCase.js';

export const VALID_TRANSITIONS = {
  DETECTED: ['ANALYZING', 'STOPPED', 'FAILED'],
  ANALYZING: ['ELIGIBLE', 'ESCALATED', 'FAILED', 'STOPPED'],
  ELIGIBLE: ['ACTION_PLANNED', 'ESCALATED', 'STOPPED'],
  ACTION_PLANNED: ['ACTION_SCHEDULED', 'ESCALATED', 'STOPPED'],
  ACTION_SCHEDULED: ['ACTION_EXECUTED', 'ESCALATED', 'STOPPED'],
  ACTION_EXECUTED: ['RECOVERED', 'FAILED', 'ESCALATED', 'STOPPED'],
  RECOVERED: [], // Terminal State
  FAILED: [],    // Terminal State
  ESCALATED: ['ELIGIBLE', 'STOPPED', 'FAILED'], // Can re-evaluate if merchant approves
  STOPPED: [],   // Terminal State
};

export class StateTransitionError extends Error {
  constructor(currentState, targetState, caseId) {
    super(`Invalid state transition for Case ${caseId}: cannot move from '${currentState}' to '${targetState}'`);
    this.name = 'StateTransitionError';
    this.currentState = currentState;
    this.targetState = targetState;
    this.caseId = caseId;
  }
}

// Validates whether a state transition is allowed.

export const canTransition = (currentState, targetState) => {
  if (!RECOVERY_CASE_STATES.includes(currentState) || !RECOVERY_CASE_STATES.includes(targetState)) {
    return false;
  }
  const allowed = VALID_TRANSITIONS[currentState] || [];
  return allowed.includes(targetState);
};

// Validates and enforces a state transition. Throws StateTransitionError if invalid.
export const validateTransition = (currentState, targetState, caseId = 'UNKNOWN') => {
  if (!canTransition(currentState, targetState)) {
    throw new StateTransitionError(currentState, targetState, caseId);
  }
  return true;
};
