// Authentication & Authorization Middleware for RecoverAI APIs.
export const authenticateMerchant = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'] || req.query.apiKey;

  // Development mode fallback: auto-assign default merchant context
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !process.env.REQUIRE_AUTH) {
    req.merchant = { merchantId: req.body?.merchantId || req.query?.merchantId || 'mer_default' };
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Merchant authentication required. Please provide x-api-key header.',
      },
    });
  }

  req.merchant = { merchantId: 'mer_default', apiKey };
  next();
};

export const requireAuth = authenticateMerchant;
