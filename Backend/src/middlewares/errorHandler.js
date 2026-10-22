import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/**
 * Sanitizes MongoDB connection URIs and credentials from arbitrary text.
 *
 * @param {string} text
 * @returns {string}
 */
export function sanitizeSensitiveText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)@/gi, '$1[REDACTED]@');
}

/**
 * 404 Handler for unregistered routes.
 */
export function notFoundHandler(req, res, next) {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

/**
 * Centralized application error handling middleware.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const requestId = req.id || req.headers['x-request-id'] || null;

  // 1. JSON parsing syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn({
      requestId,
      event: 'malformed_json_body',
      url: req.originalUrl,
      method: req.method
    }, 'Client sent malformed JSON');

    return sendError(res, {
      code: 'INVALID_JSON',
      message: 'Malformed JSON payload in request body',
      requestId,
      statusCode: 400
    });
  }

  // 2. Mongoose Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: sanitizeSensitiveText(e.message)
    }));

    logger.warn({
      requestId,
      event: 'mongoose_validation_error',
      details
    }, 'Mongoose schema validation failed');

    return sendError(res, {
      code: 'VALIDATION_ERROR',
      message: 'Database validation failed',
      details,
      requestId,
      statusCode: 400
    });
  }

  // 3. Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    logger.warn({
      requestId,
      event: 'mongoose_cast_error',
      path: err.path
      // Do not log raw user value to prevent sensitive data leakage
    }, 'Invalid data type or ID format');

    return sendError(res, {
      code: 'INVALID_IDENTIFIER',
      message: `Invalid format for field '${err.path}'`,
      requestId,
      statusCode: 400
    });
  }

  // 4. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    logger.warn({
      requestId,
      event: 'mongoose_duplicate_key',
      fields
    }, 'Duplicate key conflict');

    return sendError(res, {
      code: 'DUPLICATE_KEY_CONFLICT',
      message: `Resource with provided ${fields.join(', ')} already exists`,
      requestId,
      statusCode: 409
    });
  }

  // 5. Known operational AppError
  if (err instanceof AppError && err.isOperational) {
    const safeMessage = sanitizeSensitiveText(err.message);
    if (err.statusCode >= 500) {
      logger.error({
        requestId,
        event: 'operational_server_error',
        err: {
          message: safeMessage,
          code: err.code,
          stack: sanitizeSensitiveText(err.stack)
        }
      }, safeMessage);
    } else {
      logger.warn({
        requestId,
        event: 'operational_client_error',
        statusCode: err.statusCode,
        code: err.code,
        message: safeMessage,
        details: err.details
      }, safeMessage);
    }

    return sendError(res, {
      code: err.code,
      message: safeMessage,
      details: err.details,
      requestId,
      statusCode: err.statusCode
    });
  }

  // 6. Unknown / Unhandled programmer or infrastructure error
  const safeMessage = sanitizeSensitiveText(err.message || '');
  const safeStack = sanitizeSensitiveText(err.stack || '');
  const isProduction = env.NODE_ENV === 'production';

  logger.error({
    requestId,
    event: 'unhandled_exception',
    url: req.originalUrl,
    method: req.method,
    err: {
      message: safeMessage,
      stack: isProduction ? undefined : safeStack
    }
  }, 'Unhandled internal error');

  return sendError(res, {
    code: 'INTERNAL_ERROR',
    message: isProduction
      ? 'An internal server error occurred'
      : (safeMessage || 'An internal server error occurred'),
    requestId,
    statusCode: 500
  });
}

export default errorHandler;
