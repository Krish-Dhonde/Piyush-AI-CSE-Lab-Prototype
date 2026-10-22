import { Router } from 'express';
import healthRoutes from './health.routes.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// Mount health checks
router.use('/health', healthRoutes);

// Root informational endpoint
router.get('/', (req, res) => {
  return sendSuccess(res, {
    name: 'Virtual CSE Lab Backend API',
    version: '0.1.0',
    documentation: '/docs',
    status: 'operational'
  });
});

// API Documentation endpoint
router.get('/docs', (req, res) => {
  return sendSuccess(res, {
    name: 'Virtual CSE Lab Backend API',
    version: '0.1.0',
    milestone: 'Milestone 1 — Backend Platform Foundation',
    description: 'API documentation and endpoint reference for Virtual CSE Laboratory platform',
    endpoints: [
      {
        path: '/',
        method: 'GET',
        description: 'Root informational endpoint returning API service status and metadata'
      },
      {
        path: '/docs',
        method: 'GET',
        description: 'Milestone 1 API documentation and endpoint specifications'
      },
      {
        path: '/health/live',
        method: 'GET',
        description: 'Liveness probe indicating if the HTTP server process is running'
      },
      {
        path: '/health/ready',
        method: 'GET',
        description: 'Readiness probe verifying operational readiness and database connectivity'
      }
    ],
    security: {
      headers: 'Helmet defense-in-depth HTTP security headers',
      cors: 'Whitelisted origin validation with credential protection',
      rateLimiting: 'IP-based sliding window rate limiter',
      requestTracing: 'Validated X-Request-Id header propagation and server UUID fallback'
    }
  });
});

export default router;

