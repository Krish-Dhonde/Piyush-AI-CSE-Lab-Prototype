import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { app } from '../../src/app.js';
import { validate } from '../../src/middlewares/validate.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';

describe('Error Handling Middleware (Integration)', () => {
  describe('404 Not Found Handling', () => {
    it('should return standardized 404 JSON for unknown routes', async () => {
      const res = await request(app).get('/api/v1/non-existent-route');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toContain('Cannot GET /api/v1/non-existent-route');
      expect(res.body.requestId).toBeDefined();
    });
  });

  describe('Malformed JSON Handling', () => {
    it('should return 400 INVALID_JSON for corrupted JSON payload', async () => {
      const res = await request(app)
        .post('/health/live')
        .set('Content-Type', 'application/json')
        .send('{ "brokenJson": ');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_JSON');
      expect(res.body.error.message).toContain('Malformed JSON payload');
    });
  });

  describe('Schema Validation Errors', () => {
    it('should return 400 VALIDATION_ERROR with structured field errors', async () => {
      const testApp = express();
      testApp.use(express.json());

      const bodySchema = z.object({
        email: z.string().email(),
        age: z.number().min(18)
      });

      testApp.post(
        '/test-validation',
        validate({ body: bodySchema }),
        (req, res) => res.json({ success: true, data: req.body })
      );
      testApp.use(errorHandler);

      const res = await request(testApp)
        .post('/test-validation')
        .send({ email: 'not-an-email', age: 10 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBe(2);
    });
  });

  describe('Security: Stack Trace & Credential Sanitation', () => {
    it('should not leak stack trace or database credentials in client error response', async () => {
      const testApp = express();
      testApp.get('/test-internal-error', () => {
        throw new Error('Database connection failed for mongodb://admin:secretPass123@internal.cluster:27017/prod');
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get('/test-internal-error');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(res.body.error.stack).toBeUndefined();
      expect(res.body.error.message).not.toContain('secretPass123');
      expect(res.body.error.message).toContain('[REDACTED]');
    });

    it('should handle Mongoose CastError cleanly without leaking sensitive raw values', async () => {
      const testApp = express();
      testApp.get('/test-cast-error', () => {
        const castErr = new Error('Cast to ObjectId failed for value "secretUserKey123" (type string)');
        castErr.name = 'CastError';
        castErr.path = '_id';
        castErr.value = 'secretUserKey123';
        throw castErr;
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get('/test-cast-error');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_IDENTIFIER');
      expect(res.body.error.message).toBe("Invalid format for field '_id'");
    });
  });
});
