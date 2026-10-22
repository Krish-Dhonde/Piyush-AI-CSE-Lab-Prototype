import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';

/**
 * Creates a rate limiter instance with standardized error format.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.max]
 * @param {string} [options.message]
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || env.RATE_LIMIT_WINDOW_MS;
  const max = options.max || env.RATE_LIMIT_MAX;
  const message = options.message || 'Too many requests from this IP, please try again later.';

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return standard RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    handler: (req, res) => {
      sendError(res, {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        requestId: req.id,
        statusCode: 429
      });
    },
    // In test environment, skip unless explicitly enabled for rate-limit tests
    skip: () => env.NODE_ENV === 'test' && !options.enableInTest
  });
}

export const defaultLimiter = createRateLimiter();

export default defaultLimiter;
