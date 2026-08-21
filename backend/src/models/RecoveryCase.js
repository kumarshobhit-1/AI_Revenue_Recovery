import mongoose from 'mongoose';

export const RECOVERY_CASE_STATES = [
  'DETECTED',
  'ANALYZING',
  'ELIGIBLE',
  'ACTION_PLANNED',
  'ACTION_SCHEDULED',
  'ACTION_EXECUTED',
  'RECOVERED',
  'FAILED',
  'ESCALATED',
  'STOPPED',
];

const recoveryCaseSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    merchantId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    state: {
      type: String,
      enum: RECOVERY_CASE_STATES,
      default: 'DETECTED',
      index: true,
    },
    revenueAtRisk: {
      type: Number,
      required: true,
      min: 0,
    },
    recoveredAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextScheduledRetry: {
      type: Date,
    },
    failureCategory: {
      type: String,
    },
  },
  { timestamps: true }
);

export const RecoveryCase = mongoose.model('RecoveryCase', recoveryCaseSchema);
