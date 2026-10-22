import { Router } from 'express';
import { isDatabaseReady, getDatabaseState } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * Liveness probe: returns 200 if process is up and responding.
 */
router.get('/live', (req, res) => {
  return sendSuccess(res, {
    status: 'ok',
    service: 'virtual-cse-lab-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe: checks dependencies (e.g. MongoDB) to confirm readiness for traffic.
 */
router.get('/ready', (req, res) => {
  const dbReady = isDatabaseReady();
  const dbState = getDatabaseState();

  if (!dbReady) {
    return sendError(res, {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service is not ready to accept traffic',
      details: {
        database: dbState
      },
      requestId: req.id,
      statusCode: 503
    });
  }

  return sendSuccess(res, {
    status: 'ready',
    service: 'virtual-cse-lab-backend',
    checks: {
      database: dbState
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
