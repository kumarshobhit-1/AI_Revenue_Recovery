import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    merchantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    ltv: {
      type: Number,
      default: 0,
      min: 0,
    },
    successfulTxnCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failedTxnCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isOptedOut: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

export const Customer = mongoose.model('Customer', customerSchema);
