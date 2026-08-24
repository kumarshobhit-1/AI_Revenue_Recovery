import { paymentService } from '../services/paymentService.js';

export const paymentController = {
  // Handles POST /api/payments/attempt
  async handleAttempt(req, res, next) {
    try {
      const result = await paymentService.createPaymentAttempt(req.body);
      return res.status(201).json({
        success: true,
        message: result.payment.status === 'SUCCESS'
          ? 'Payment attempt processed successfully'
          : 'Payment attempt failed. Revenue recovery pipeline triggered.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // Handles GET /api/payments
  async handleList(req, res, next) {
    try {
      const result = await paymentService.listPayments(req.query);
      return res.status(200).json({
        success: true,
        data: result.payments,
        pagination: {
          total: result.total,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 50,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
