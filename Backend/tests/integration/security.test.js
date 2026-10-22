import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { app, createApp } from '../../src/app.js';
import { createRateLimiter } from '../../src/middlewares/rateLimiter.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';

describe('Security & Middleware Architecture (Integration)', () => {
  describe('HTTP Security Headers (Helmet)', () => {
    it('should include standard security headers in responses', async () => {
      const res = await request(app).get('/health/live');

      expect(res.headers).toHaveProperty('x-dns-prefetch-control');
      expect(res.headers).toHaveProperty('x-frame-options');
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('CORS Controls', () => {
    it('should allow requests from whitelisted origin with credentials enabled', async () => {
      const res = await request(app)
        .get('/health/live')
        .set('Origin', 'http://localhost:3000');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject requests from unauthorized origins', async () => {
      const res = await request(app)
        .get('/health/live')
        .set('Origin', 'http://malicious-website.com');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CORS_FORBIDDEN');
    });

    it('should reject wildcard origins when credentialed requests are enabled', () => {
      expect(() => {
        createApp({
          cors: {
            origin: '*',
            credentials: true
          }
        });
      }).toThrow(/Wildcard origin "\*" is prohibited when credentialed requests are enabled/);
    });

    it('should allow wildcard origin when credentials are explicitly disabled', async () => {
      const uncredentialedApp = createApp({
        cors: {
          origin: '*',
          credentials: false
        }
      });

      const res = await request(uncredentialedApp)
        .get('/health/live')
        .set('Origin', 'http://public-client.org');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    });
  });

  describe('Request ID Tracing & Validation', () => {
    it('should generate and return a new UUID X-Request-Id if not provided', async () => {
      const res = await request(app).get('/health/live');

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should preserve and echo client provided valid X-Request-Id', async () => {
      const customId = 'test-client-req-999';
      const res = await request(app)
        .get('/health/live')
        .set('X-Request-Id', customId);

      expect(res.headers['x-request-id']).toBe(customId);
    });

    it('should replace malformed X-Request-Id containing illegal characters with a server UUID', async () => {
      const malformedId = '<script>alert("xss")</script>';
      const res = await request(app)
        .get('/health/live')
        .set('X-Request-Id', malformedId);

      expect(res.headers['x-request-id']).not.toBe(malformedId);
      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should replace oversized X-Request-Id (>128 chars) with a server UUID', async () => {
      const oversizedId = 'a'.repeat(129);
      const res = await request(app)
        .get('/health/live')
        .set('X-Request-Id', oversizedId);

      expect(res.headers['x-request-id']).not.toBe(oversizedId);
      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should replace whitespace-only X-Request-Id with a server UUID', async () => {
      const res = await request(app)
        .get('/health/live')
        .set('X-Request-Id', '    ');

      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce request limits and respond with 429 when threshold exceeded', async () => {
      const testApp = express();
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        enableInTest: true
      });

      testApp.use(limiter);
      testApp.get('/test-limit', (req, res) => res.json({ ok: true }));
      testApp.use(errorHandler);

      const res1 = await request(testApp).get('/test-limit');
      expect(res1.status).toBe(200);

      const res2 = await request(testApp).get('/test-limit');
      expect(res2.status).toBe(200);

      const res3 = await request(testApp).get('/test-limit');
      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
      expect(res3.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
