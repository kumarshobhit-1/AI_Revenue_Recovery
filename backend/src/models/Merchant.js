import mongoose from 'mongoose';

const merchantSchema = new mongoose.Schema(
  {
    merchantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    apiKey: {
      type: String,
      required: true,
    },
    policyLimits: {
      maxRetries: { type: Number, default: 3 },
      maxDelayHours: { type: Number, default: 72 },
      highValueThresholdAmount: { type: Number, default: 50000 },
      minRetryDelayMinutes: { type: Number, default: 240 },
    },
  },
  { timestamps: true }
);

export const Merchant = mongoose.model('Merchant', merchantSchema);
