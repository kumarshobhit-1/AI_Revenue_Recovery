import mongoose from 'mongoose';

export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'];
export const NOTIFICATION_STATUSES = ['QUEUED', 'SENT', 'FAILED', 'OPTED_OUT'];

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
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
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: NOTIFICATION_CHANNELS,
      required: true,
    },
    status: {
      type: String,
      enum: NOTIFICATION_STATUSES,
      default: 'QUEUED',
      index: true,
    },
    messageBody: {
      type: String,
      required: true,
    },
    deliveredAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
