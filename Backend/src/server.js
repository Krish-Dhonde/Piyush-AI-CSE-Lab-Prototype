import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';
import { logger } from './config/logger.js';

let server = null;
let isShuttingDown = false;

/**
 * Resets shutdown state and server reference for testing.
 * @internal
 */
export function _resetShutdownState() {
  isShuttingDown = false;
  server = null;
}

export function getServerInstance() {
  return server;
}

export function setServerInstance(s) {
  server = s;
}

/**
 * Gracefully shuts down the HTTP server and database connections.
 *
 * @param {string} signal - The signal or reason triggering shutdown
 * @param {number} [exitCode=0]
 * @param {object} [options]
 * @param {boolean} [options.exit=true] - Whether to call process.exit (can be disabled in tests)
 * @param {Function} [options.exitFn=process.exit] - Exit function to invoke
 */
export async function gracefulShutdown(signal, exitCode = 0, { exit = true, exitFn = process.exit } = {}) {
  if (isShuttingDown) {
    logger.warn({ signal }, 'Shutdown already in progress, ignoring duplicate call');
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown initiated');

  // Set timeout to force exit if cleanup hangs
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s, forcing exit');
    if (exit) exitFn(1);
  }, 10000);
  forceExitTimeout.unref();

  try {
    if (server) {
      // Close idle keep-alive connections so in-flight requests finish without keeping server alive indefinitely
      if (typeof server.closeIdleConnections === 'function') {
        server.closeIdleConnections();
      }

      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      logger.info('HTTP server closed');
      server = null;
    }

    await disconnectDB();
    logger.info('Database connection closed cleanly');

    clearTimeout(forceExitTimeout);
    logger.info('Graceful shutdown completed successfully');
    if (exit) {
      exitFn(exitCode);
    }
  } catch (error) {
    clearTimeout(forceExitTimeout);
    logger.error({ error: error.message }, 'Error during graceful shutdown');
    if (exit) {
      exitFn(1);
    }
    throw error;
  }
}

/**
 * Starts the application server.
 *
 * @param {object} [options]
 * @param {boolean} [options.exitOnFailure=true]
 * @param {Function} [options.exitFn=process.exit]
 */
export async function startServer({ exitOnFailure = true, exitFn = process.exit } = {}) {
  try {
    logger.info({ nodeEnv: env.NODE_ENV }, 'Starting Virtual CSE Lab Backend...');

    // Connect to database
    await connectDB(env.MONGODB_URI);

    // Start HTTP listening
    server = app.listen(env.PORT, env.HOST, () => {
      logger.info(
        {
          port: env.PORT,
          host: env.HOST,
          env: env.NODE_ENV
        },
        `Server running at http://${env.HOST}:${env.PORT}`
      );
    });

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));
    process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (err) => {
      logger.fatal({ err: err?.message }, 'Uncaught exception caught in root handler');
      gracefulShutdown('uncaughtException', 1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.fatal({ reason: String(reason) }, 'Unhandled rejection caught in root handler');
      gracefulShutdown('unhandledRejection', 1);
    });

    return server;
  } catch (error) {
    logger.fatal({ error: error.message }, 'Application failed to start');
    try {
      await disconnectDB();
    } catch {
      // ignore secondary errors during abort
    }
    if (exitOnFailure) {
      exitFn(1);
    }
    throw error;
  }
}

// Auto-start if executed directly as entrypoint
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}
