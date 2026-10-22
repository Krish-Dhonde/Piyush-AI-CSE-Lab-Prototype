/**
 * Format and send a standardized API success response.
 *
 * @param {import('express').Response} res
 * @param {unknown} data
 * @param {Record<string, unknown>} [meta]
 * @param {number} [statusCode=200]
 */
export function sendSuccess(res, data = null, meta = undefined, statusCode = 200) {
  const payload = {
    success: true,
    data
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

/**
 * Format and send a standardized API error response.
 *
 * @param {import('express').Response} res
 * @param {object} params
 * @param {string} params.code
 * @param {string} params.message
 * @param {unknown} [params.details]
 * @param {string} [params.requestId]
 * @param {number} [params.statusCode=500]
 */
export function sendError(res, { code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', details = null, requestId = null, statusCode = 500 }) {
  const payload = {
    success: false,
    error: {
      code,
      message
    }
  };

  if (details !== null && details !== undefined) {
    payload.error.details = details;
  }

  if (requestId) {
    payload.requestId = requestId;
  }

  return res.status(statusCode).json(payload);
}
