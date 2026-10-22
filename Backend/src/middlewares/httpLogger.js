import pinoHttp from 'pino-http';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/**
 * Express middleware for structured HTTP request/response logging.
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id || req.headers['x-request-id'],
  autoLogging: {
    ignore: (req) => {
      // Avoid spamming logs with frequent health check polling in development
      if (req.url === '/health/live' && env.NODE_ENV !== 'production') {
        return true;
      }
      return false;
    }
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err?.message || 'Error'}`;
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode
      };
    }
  }
});

export default httpLogger;
