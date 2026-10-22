import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/database.js';
import { env } from '../../src/config/env.js';

describe('Health Endpoints (Integration)', () => {
  describe('GET /health/live', () => {
    it('should return 200 OK with liveness details', async () => {
      const res = await request(app).get('/health/live');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.service).toBe('virtual-cse-lab-backend');
      expect(typeof res.body.data.uptime).toBe('number');
      expect(typeof res.body.data.timestamp).toBe('string');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 503 when database is disconnected', async () => {
      await disconnectDB();

      const res = await request(app).get('/health/ready');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(res.body.error.details.database).toBe('disconnected');
    });

    it('should return 200 when database is connected', async () => {
      await connectDB(env.MONGODB_URI);

      const res = await request(app).get('/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.checks.database).toBe('connected');

      await disconnectDB();
    });
  });
});
