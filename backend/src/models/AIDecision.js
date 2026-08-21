import mongoose from 'mongoose';

const aiDecisionSchema = new mongoose.Schema(
  {
    decisionId: {
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
    classification: {
      type: String,
      required: true,
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    recommendedAction: {
      type: String,
      required: true,
    },
    suggestedDelayMinutes: {
      type: Number,
      default: 0,
    },
    suggestedChannel: {
      type: String,
      enum: ['EMAIL', 'SMS', 'WHATSAPP', null],
      default: null,
    },
    rationale: {
      type: [String],
      default: [],
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export const AIDecision = mongoose.model('AIDecision', aiDecisionSchema);
