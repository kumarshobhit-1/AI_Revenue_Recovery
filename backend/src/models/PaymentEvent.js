import mongoose from 'mongoose';

const paymentEventSchema = new mongoose.Schema(
  {
    eventId: {
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
    merchantId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
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
    failureReason: {
      type: String,
      required: true,
    },
    gatewayErrorCode: {
      type: String,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const PaymentEvent = mongoose.model('PaymentEvent', paymentEventSchema);
