import { randomUUID } from 'node:crypto';

const REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * Validates whether a given request ID consists of permitted characters and safe length.
 * Permitted: alphanumeric, hyphens, and underscores. Length: 1 to 128 characters.
 *
 * @param {unknown} id
 * @returns {boolean}
 */
export function isValidRequestId(id) {
  return typeof id === 'string' && REQUEST_ID_REGEX.test(id.trim());
}

/**
 * Middleware that assigns a unique request ID to each incoming request.
 * Validates incoming X-Request-Id headers and generates a server-side UUID
 * if the provided ID is missing, malformed, or exceeds length boundaries.
 * Propagates the validated or generated ID in req.id and the X-Request-Id response header.
 */
export function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId = isValidRequestId(incomingId)
    ? incomingId.trim()
    : randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

export default requestIdMiddleware;

