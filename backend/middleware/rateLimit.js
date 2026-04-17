import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Too many attempts, try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
