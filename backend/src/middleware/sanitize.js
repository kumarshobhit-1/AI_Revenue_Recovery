// Sensitive Credentials Masking & Payload Sanitization Utility.
export const sanitizePayload = (data) => {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item));
  }

  const sanitized = { ...data };
  const sensitiveKeys = ['cardNumber', 'card_number', 'cvv', 'cvc', 'pin', 'upiPin', 'password', 'secret', 'authCode'];

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s.toLowerCase()))) {
      if (typeof sanitized[key] === 'string') {
        const str = sanitized[key];
        sanitized[key] = str.length > 4 ? `****${str.slice(-4)}` : '****';
      } else {
        sanitized[key] = '****';
      }
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizePayload(sanitized[key]);
    }
  }

  return sanitized;
};

export const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizePayload(req.body);
  }
  next();
};
