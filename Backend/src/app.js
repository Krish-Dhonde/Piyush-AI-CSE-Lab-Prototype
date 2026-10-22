import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middlewares/requestId.js';
import { httpLogger } from './middlewares/httpLogger.js';
import { defaultLimiter } from './middlewares/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';
import { AppError } from './utils/AppError.js';

/**
 * Express application factory.
 * Separates Express configuration from HTTP server lifecycle for testability.
 */
export function createApp(options = {}) {
  const app = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. CORS configuration
  const corsOriginsConfig = options.cors?.origin ?? env.CORS_ORIGIN;
  const corsCredentials = options.cors?.credentials ?? true;

  const allowedOrigins = typeof corsOriginsConfig === 'string'
    ? corsOriginsConfig.split(',').map((origin) => origin.trim()).filter(Boolean)
    : Array.isArray(corsOriginsConfig)
      ? corsOriginsConfig.map((origin) => origin.trim()).filter(Boolean)
      : [];

  // Reject wildcard origin when credentialed requests are enabled
  if (corsCredentials && allowedOrigins.includes('*')) {
    throw new Error(
      'Insecure CORS configuration: Wildcard origin "*" is prohibited when credentialed requests are enabled.'
    );
  }

  const corsOriginHandler = (!corsCredentials && allowedOrigins.includes('*'))
    ? '*'
    : (origin, callback) => {
        // Allow requests with no origin (e.g. server-to-server, curl, mobile clients)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(
          new AppError(`Origin '${origin}' not permitted by CORS policy`, 403, 'CORS_FORBIDDEN')
        );
      };

  app.use(
    cors({
      origin: corsOriginHandler,
      credentials: corsCredentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
    })
  );

  // 3. Request ID tracing
  app.use(requestIdMiddleware);

  // 4. Structured HTTP Logging
  app.use(httpLogger);

  // 5. Body Parsing with safe size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 6. Global Rate Limiter
  app.use(defaultLimiter);

  // 7. Application Routes
  app.use('/', routes);

  // 8. 404 Route Handler
  app.use(notFoundHandler);

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

export default app;
