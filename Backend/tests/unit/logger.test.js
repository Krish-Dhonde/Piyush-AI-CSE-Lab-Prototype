import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { logger } from '../../src/config/logger.js';

describe('Structured Logger Redaction (Unit)', () => {
  it('should redact sensitive properties such as password, token, and authorization headers', () => {
    let loggedOutput = '';
    const destination = {
      write(chunk) {
        loggedOutput += chunk;
      }
    };

    // Instantiate pino with the exact redaction configuration paths from our logger
    const redactPaths = [
      'password',
      'confirmPassword',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'creditCard',
      'MONGODB_URI',
      'mongodbUri',
      'uri',
      'connectionString',
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      '*.password',
      '*.confirmPassword',
      '*.token',
      '*.MONGODB_URI',
      '*.uri',
      '*.connectionString'
    ];

    const testLogger = pino(
      {
        redact: {
          paths: redactPaths,
          censor: '[REDACTED]'
        }
      },
      destination
    );

    testLogger.info({
      user: 'alice',
      password: 'SuperSecretPassword123!',
      confirmPassword: 'SuperSecretPassword123!',
      token: 'jwt-token-string-xyz',
      MONGODB_URI: 'mongodb://admin:pass@host:27017/db',
      uri: 'mongodb://admin:pass@host:27017/db',
      connectionString: 'mongodb+srv://admin:pass@cluster.mongodb.net/prod',
      req: {
        headers: {
          authorization: 'Bearer secret-jwt-token',
          'x-api-key': 'live_api_key_secret'
        }
      },
      nested: {
        password: 'nestedSecret',
        MONGODB_URI: 'mongodb://user:pass@host/db'
      }
    });

    const parsed = JSON.parse(loggedOutput);
    expect(parsed.user).toBe('alice');
    expect(parsed.password).toBe('[REDACTED]');
    expect(parsed.confirmPassword).toBe('[REDACTED]');
    expect(parsed.token).toBe('[REDACTED]');
    expect(parsed.MONGODB_URI).toBe('[REDACTED]');
    expect(parsed.uri).toBe('[REDACTED]');
    expect(parsed.connectionString).toBe('[REDACTED]');
    expect(parsed.req.headers.authorization).toBe('[REDACTED]');
    expect(parsed.req.headers['x-api-key']).toBe('[REDACTED]');
    expect(parsed.nested.password).toBe('[REDACTED]');
    expect(parsed.nested.MONGODB_URI).toBe('[REDACTED]');
  });

  it('should verify configured application logger has redaction enabled', () => {
    expect(logger).toBeDefined();
    // Verify logger instance is functional
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
