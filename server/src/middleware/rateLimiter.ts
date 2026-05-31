import rateLimit from 'express-rate-limit';

export const researchRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 research requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many research requests. Please wait 15 minutes.' },
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
});
