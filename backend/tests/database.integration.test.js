import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { Payment } from '../src/models/Payment.js';

describe('MongoDB Integration Tests (Real Database Persistence)', () => {
  beforeAll(async () => {
    // Connect to real MongoDB instance
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recoverai';
    await connectDB(uri);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('should be connected to MongoDB instance', () => {
    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.name).toBe('recoverai');
  });

  it('should persist a Payment document into MongoDB payments collection', async () => {
    const paymentId = `pay_int_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const paymentData = {
      paymentId,
      merchantId: 'mer_default',
      customerId: `cust_int_${Date.now()}`,
      amount: 7499,
      currency: 'INR',
      paymentMethod: 'UPI',
      status: 'FAILED',
      errorCode: 'INSUFFICIENT_FUNDS',
      failureReason: 'Customer account balance insufficient',
    };

    // Save to real MongoDB collection
    const created = await Payment.create(paymentData);
    expect(created._id).toBeDefined();

    // Query directly from MongoDB
    const found = await Payment.findOne({ paymentId });
    expect(found).not.toBeNull();
    expect(found.paymentId).toBe(paymentId);
    expect(found.amount).toBe(7499);
    expect(found.status).toBe('FAILED');

    // Clean up test document
    await Payment.deleteOne({ paymentId });
  });

  it('should update Payment document status in MongoDB', async () => {
    const paymentId = `pay_upd_int_${Date.now()}`;
    await Payment.create({
      paymentId,
      merchantId: 'mer_default',
      customerId: 'cust_upd',
      amount: 12000,
      status: 'FAILED',
    });

    await Payment.updateOne({ paymentId }, { status: 'RECOVERED' });

    const updated = await Payment.findOne({ paymentId });
    expect(updated.status).toBe('RECOVERED');

    // Clean up test document
    await Payment.deleteOne({ paymentId });
  });
});
