import mongoose from 'mongoose';

export const AUDIT_ACTORS = ['SYSTEM', 'AI_AGENT', 'POLICY_ENGINE', 'MERCHANT'];

const auditLogSchema = new mongoose.Schema(
  {
    auditId: {
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
    actor: {
      type: String,
      enum: AUDIT_ACTORS,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    previousState: {
      type: String,
    },
    newState: {
      type: String,
    },
    summary: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
