// Sliding Window Rate Limiting Middleware for API Security Hardening.
const rateLimitMap = new Map();

export const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100; // 100 requests per window default
  const message = options.message || 'Too many requests from this IP, please try again later.';

  return (req, res, next) => {
    // Disable rate limiting during automated test runs
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitMap.get(key);

    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      rateLimitMap.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetTime = new Date(record.startTime + windowMs).toISOString();

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);

      return res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message,
          retryAfterSeconds,
        },
      });
    }

    next();
  };
};

export const apiRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 });
export const sensitiveEndpointLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Sensitive payment action rate limit exceeded. Please wait 1 minute.',
});
