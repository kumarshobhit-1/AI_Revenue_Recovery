import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { gatewaySimulator, GATEWAY_DECLINE_CODES } from '../src/engine/gatewaySimulator.js';
import { paymentService } from '../src/services/paymentService.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { Payment } from '../src/models/Payment.js';

describe('Phase 2B — Payment Gateway Simulator Engine Tests', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recoverai';
    await connectDB(uri);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('Gateway Simulator Unit Tests', () => {
    it('1. CARD — should process CARD SUCCESS transaction with metadata', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 4999,
        paymentMethod: 'CARD',
        simulateResult: 'SUCCESS',
      });

      expect(res.isSuccess).toBe(true);
      expect(res.gatewayResponse.status).toBe('CAPTURED');
      expect(res.gatewayResponse.responseCode).toBe('200_SUCCESS');
      expect(res.gatewayResponse.gatewayTxnId).toMatch(/^gtw_card_/);
      expect(typeof res.gatewayResponse.latencyMs).toBe('number');
      expect(res.gatewayResponse.processedAt).toBeDefined();
    });

    it('2. CARD — should process CARD INSUFFICIENT_FUNDS decline', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 8500,
        paymentMethod: 'CARD',
        simulateResult: 'FAILED',
        simulateErrorCode: 'INSUFFICIENT_FUNDS',
      });

      expect(res.isSuccess).toBe(false);
      expect(res.errorCode).toBe('INSUFFICIENT_FUNDS');
      expect(res.gatewayResponse.status).toBe('DECLINED');
      expect(res.gatewayResponse.responseCode).toBe('402_PAYMENT_REQUIRED');
    });

    it('3. CARD — should process CARD EXPIRED_CARD decline', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 1500,
        paymentMethod: 'CARD',
        simulateResult: 'FAILED',
        simulateErrorCode: 'EXPIRED_CARD',
      });

      expect(res.isSuccess).toBe(false);
      expect(res.errorCode).toBe('EXPIRED_CARD');
      expect(res.gatewayResponse.responseCode).toBe('400_BAD_REQUEST');
    });

    it('4. CARD — should process CARD CARD_BLOCKED decline', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 3200,
        paymentMethod: 'CARD',
        simulateResult: 'FAILED',
        simulateErrorCode: 'CARD_BLOCKED',
      });

      expect(res.isSuccess).toBe(false);
      expect(res.errorCode).toBe('CARD_BLOCKED');
      expect(res.gatewayResponse.responseCode).toBe('403_FORBIDDEN');
    });

    it('5. CARD — should process CARD BANK_TIMEOUT decline', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 12000,
        paymentMethod: 'CARD',
        simulateResult: 'FAILED',
        simulateErrorCode: 'BANK_TIMEOUT',
      });

      expect(res.isSuccess).toBe(false);
      expect(res.errorCode).toBe('BANK_TIMEOUT');
      expect(res.gatewayResponse.responseCode).toBe('504_GATEWAY_TIMEOUT');
    });

    it('6. UPI — should process UPI SUCCESS transaction', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 2500,
        paymentMethod: 'UPI',
        simulateResult: 'SUCCESS',
      });

      expect(res.isSuccess).toBe(true);
      expect(res.gatewayResponse.paymentMethod).toBe('UPI');
      expect(res.gatewayResponse.gatewayTxnId).toMatch(/^gtw_upi_/);
    });

    it('7. UPI — should process UPI_TIMEOUT decline', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 1999,
        paymentMethod: 'UPI',
        simulateResult: 'FAILED',
        simulateErrorCode: 'UPI_TIMEOUT',
      });

      expect(res.isSuccess).toBe(false);
      expect(res.errorCode).toBe('UPI_TIMEOUT');
      expect(res.gatewayResponse.responseCode).toBe('504_GATEWAY_TIMEOUT');
    });

    it('8. UPI — should process AUTHENTICATION_FAILED decline', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 750,
        paymentMethod: 'UPI',
        simulateResult: 'FAILED',
        simulateErrorCode: 'AUTHENTICATION_FAILED',
      });

      expect(res.isSuccess).toBe(false);
      expect(res.errorCode).toBe('AUTHENTICATION_FAILED');
      expect(res.gatewayResponse.responseCode).toBe('401_UNAUTHORIZED');
    });

    it('9. NETBANKING — should process NETBANKING BANK_UNAVAILABLE decline', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 45000,
        paymentMethod: 'NETBANKING',
        simulateResult: 'FAILED',
        simulateErrorCode: 'BANK_UNAVAILABLE',
      });

      expect(res.isSuccess).toBe(false);
      expect(res.errorCode).toBe('BANK_UNAVAILABLE');
      expect(res.gatewayResponse.responseCode).toBe('503_SERVICE_UNAVAILABLE');
    });

    it('10. MANDATE — should process MANDATE_REJECTED decline', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 2999,
        paymentMethod: 'MANDATE',
        simulateResult: 'FAILED',
        simulateErrorCode: 'MANDATE_REJECTED',
      });

      expect(res.isSuccess).toBe(false);
      expect(res.errorCode).toBe('MANDATE_REJECTED');
      expect(res.gatewayResponse.responseCode).toBe('400_BAD_REQUEST');
    });

    it('11. MANDATE — should process AUTHORIZATION_FAILED decline', async () => {
      const res = await gatewaySimulator.processTransaction({
        amount: 5999,
        paymentMethod: 'MANDATE',
        simulateResult: 'FAILED',
        simulateErrorCode: 'AUTHORIZATION_FAILED',
      });

      expect(res.isSuccess).toBe(false);
      expect(res.errorCode).toBe('AUTHORIZATION_FAILED');
      expect(res.gatewayResponse.responseCode).toBe('403_FORBIDDEN');
    });

    it('12. INVALID METHOD — should throw error for invalid payment method (e.g. BITCOIN)', async () => {
      await expect(
        gatewaySimulator.processTransaction({
          amount: 1000,
          paymentMethod: 'BITCOIN',
        })
      ).rejects.toThrow('Unsupported payment method: BITCOIN');
    });
  });

  describe('PaymentService + Gateway Simulator Integration', () => {
    it('13. should process payment attempt through Gateway Simulator and store single Payment document in MongoDB', async () => {
      const result = await paymentService.createPaymentAttempt({
        amount: 18500,
        paymentMethod: 'NETBANKING',
        simulateResult: 'FAILED',
        simulateErrorCode: 'BANK_TIMEOUT',
        customerName: 'Simulator Integration User',
        customerEmail: 'sim_user@example.com',
      });

      expect(result.payment).toBeDefined();
      expect(result.payment.status).toBe('FAILED');
      expect(result.payment.errorCode).toBe('BANK_TIMEOUT');
      expect(result.gatewayResult).toBeDefined();
      expect(result.gatewayResult.gatewayResponse.gatewayTxnId).toMatch(/^gtw_netbanking_/);
      expect(result.recoveryTriggered).toBe(true);
      expect(result.recoveryCase.paymentId).toBe(result.payment.paymentId);

      // Verify single document in MongoDB
      const count = await Payment.countDocuments({ paymentId: result.payment.paymentId });
      expect(count).toBe(1);

      // Clean up
      await Payment.deleteOne({ paymentId: result.payment.paymentId });
    });
  });
});
