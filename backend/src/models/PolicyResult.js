import mongoose from 'mongoose';

export const POLICY_STATUSES = ['APPROVED', 'REJECTED', 'MODIFIED'];

const policyResultSchema = new mongoose.Schema(
  {
    policyResultId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    caseId: {
      type: String,
      required: true,
      index: true,
    },
    decisionId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: POLICY_STATUSES,
      required: true,
    },
    violatedRules: {
      type: [String],
      default: [],
    },
    appliedOverrides: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const PolicyResult = mongoose.model('PolicyResult', policyResultSchema);
