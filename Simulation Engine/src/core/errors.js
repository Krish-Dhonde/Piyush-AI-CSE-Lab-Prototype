/**
 * Domain-specific error class for the simulation engine.
 */
export class EngineError extends Error {
  /**
   * @param {string} code - One of ErrorCode values
   * @param {string} message - Descriptive error message
   * @param {Record<string, unknown>} [details={}] - Contextual parameters
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.details = Object.freeze({ ...details });
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EngineError);
    }
  }

  /**
   * Serializes error to a structured plain object.
   * @returns {object}
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}
