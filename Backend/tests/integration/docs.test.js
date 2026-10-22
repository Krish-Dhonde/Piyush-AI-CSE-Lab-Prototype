import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Root & Documentation Endpoints (Integration)', () => {
  describe('GET /', () => {
    it('should return operational status and point to valid documentation endpoint', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Virtual CSE Lab Backend API');
      expect(res.body.data.version).toBe('0.1.0');
      expect(res.body.data.documentation).toBe('/docs');
      expect(res.body.data.status).toBe('operational');
    });
  });

  describe('GET /docs', () => {
    it('should return 200 OK with Milestone 1 API documentation and endpoint specs', async () => {
      const res = await request(app).get('/docs');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.milestone).toContain('Milestone 1');
      expect(Array.isArray(res.body.data.endpoints)).toBe(true);

      const paths = res.body.data.endpoints.map((e) => e.path);
      expect(paths).toContain('/');
      expect(paths).toContain('/docs');
      expect(paths).toContain('/health/live');
      expect(paths).toContain('/health/ready');

      expect(res.body.data.security).toBeDefined();
    });
  });
});
