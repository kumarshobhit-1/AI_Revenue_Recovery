import mongoose from 'mongoose';

export const PAYMENT_METHODS = ['CARD', 'UPI', 'MANDATE', 'NETBANKING'];
export const PAYMENT_STATUSES = ['INITIATED', 'SUCCESS', 'FAILED', 'RETRY_PENDING', 'RECOVERED'];

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
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
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Payment amount must be greater than or equal to 0'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE} is not a valid payment method',
      },
      default: 'CARD',
    },
    status: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: '{VALUE} is not a valid payment status',
      },
      default: 'INITIATED',
      index: true,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    errorCode: {
      type: String,
    },
    failureReason: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);
