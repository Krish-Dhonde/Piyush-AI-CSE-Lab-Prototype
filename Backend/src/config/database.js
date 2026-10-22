import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

const READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

let listenersRegistered = false;
let inFlightPromise = null;

/**
 * Strips password and sensitive credentials from MongoDB connection URI strings.
 *
 * @param {string} uri
 * @returns {string}
 */
export function sanitizeMongoUri(uri) {
  if (typeof uri !== 'string') return uri;
  return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/gi, '$1$2:[REDACTED]@');
}

/**
 * Strips MongoDB connection credentials from error messages and stack traces.
 *
 * @param {Error|unknown} err
 * @returns {Error}
 */
export function sanitizeError(err) {
  if (!(err instanceof Error)) return err;
  const sanitizedMessage = sanitizeMongoUri(err.message || '');
  const sanitized = new Error(sanitizedMessage);
  sanitized.name = err.name;
  if (err.code) sanitized.code = err.code;
  if (err.stack) {
    sanitized.stack = sanitizeMongoUri(err.stack);
  }
  return sanitized;
}

/**
 * Asserts that the URI is an isolated test database when running under test environment.
 *
 * @param {string} uri
 */
export function assertTestDatabase(uri) {
  if (typeof uri !== 'string') return;
  const isTestDb = /test/i.test(uri);
  if (!isTestDb) {
    throw new Error(
      'Database safety violation: Attempted to connect to non-test database in test environment.'
    );
  }
}

function registerConnectionListeners() {
  if (listenersRegistered) return;

  mongoose.connection.on('connected', () => {
    logger.info({
      event: 'mongodb_connected',
      host: mongoose.connection.host,
      name: mongoose.connection.name
    }, 'MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    const sanitized = sanitizeError(err);
    logger.error({
      event: 'mongodb_error',
      error: sanitized.message
    }, 'MongoDB connection error occurred');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn({
      event: 'mongodb_disconnected'
    }, 'MongoDB connection disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info({
      event: 'mongodb_reconnected'
    }, 'MongoDB connection re-established');
  });

  listenersRegistered = true;
}

/**
 * Connect to MongoDB with safe timeouts, duplicate connection guards,
 * and shared in-flight connection promise for concurrent callers.
 *
 * @param {string} [uri]
 * @param {object} [options]
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB(uri = env.MONGODB_URI, options = {}) {
  // Guard against using non-test DB when in test environment
  if (env.NODE_ENV === 'test') {
    assertTestDatabase(uri);
  }

  // If already connected, return active mongoose
  if (mongoose.connection.readyState === 1) {
    logger.debug('MongoDB already connected');
    return mongoose;
  }

  // If connection is currently in flight, reuse the same promise
  if (inFlightPromise) {
    logger.debug('MongoDB connection already in progress, sharing in-flight promise');
    return inFlightPromise;
  }

  registerConnectionListeners();

  const serverSelectionTimeoutMS = options.serverSelectionTimeoutMS ?? (env.NODE_ENV === 'test' ? 1000 : 5000);
  const connectTimeoutMS = options.connectTimeoutMS ?? 10000;

  inFlightPromise = (async () => {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS,
        connectTimeoutMS,
        autoIndex: env.NODE_ENV !== 'production',
        ...options
      });
      return conn;
    } catch (error) {
      const sanitized = sanitizeError(error);
      logger.error({
        event: 'mongodb_connection_failed',
        error: sanitized.message
      }, 'Failed to establish MongoDB connection');
      throw sanitized;
    } finally {
      // Clear in-flight promise so future calls don't return stale promise
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * Disconnect cleanly from MongoDB and reset in-flight promise state.
 *
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  inFlightPromise = null;

  if (mongoose.connection.readyState === 0) {
    return;
  }

  try {
    await mongoose.connection.close(false);
    logger.info({ event: 'mongodb_closed' }, 'MongoDB connection closed gracefully');
  } catch (error) {
    const sanitized = sanitizeError(error);
    logger.error({
      event: 'mongodb_close_failed',
      error: sanitized.message
    }, 'Error while closing MongoDB connection');
    throw sanitized;
  }
}

/**
 * Returns true if database connection is fully active and ready to handle queries.
 *
 * @returns {boolean}
 */
export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

/**
 * Returns human-readable state of MongoDB connection.
 *
 * @returns {string}
 */
export function getDatabaseState() {
  return READY_STATES[mongoose.connection.readyState] || 'unknown';
}

