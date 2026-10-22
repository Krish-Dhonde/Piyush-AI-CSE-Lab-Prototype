import { describe, it, expect } from 'vitest';
import { validateEnv } from '../../src/config/env.js';

describe('Environment Configuration & Validation (Unit)', () => {
  const validBaseEnv = {
    NODE_ENV: 'test',
    PORT: '5000',
    HOST: '127.0.0.1',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/test_db',
    CORS_ORIGIN: 'http://localhost:3000',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX: '50',
    LOG_LEVEL: 'silent'
  };

  it('should successfully parse valid environment variables', () => {
    const parsed = validateEnv(validBaseEnv);
    expect(parsed.PORT).toBe(5000);
    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/test_db');
  });

  it('should use default values for optional configurations', () => {
    const minimalEnv = {
      MONGODB_URI: 'mongodb://127.0.0.1:27017/default_db'
    };
    const parsed = validateEnv(minimalEnv);
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.PORT).toBe(5000);
    expect(parsed.HOST).toBe('127.0.0.1');
    expect(parsed.LOG_LEVEL).toBe('info');
  });

  it('should reject invalid PORT values and malformed numbers', () => {
    expect(() => {
      validateEnv({ ...validBaseEnv, PORT: 'not-a-number' });
    }).toThrow(/Environment validation failed/);

    expect(() => {
      validateEnv({ ...validBaseEnv, PORT: '70000' });
    }).toThrow(/Environment validation failed/);

    // Malformed numeric string with trailing characters (prevent partial parseInt parsing)
    expect(() => {
      validateEnv({ ...validBaseEnv, PORT: '5000abc' });
    }).toThrow(/Environment validation failed/);

    expect(() => {
      validateEnv({ ...validBaseEnv, PORT: '-50' });
    }).toThrow(/Environment validation failed/);

    expect(() => {
      validateEnv({ ...validBaseEnv, PORT: '80.5' });
    }).toThrow(/Environment validation failed/);
  });

  it('should reject malformed RATE_LIMIT configuration values', () => {
    expect(() => {
      validateEnv({ ...validBaseEnv, RATE_LIMIT_WINDOW_MS: '900000ms' });
    }).toThrow(/Environment validation failed/);

    expect(() => {
      validateEnv({ ...validBaseEnv, RATE_LIMIT_MAX: '100req' });
    }).toThrow(/Environment validation failed/);
  });

  it('should reject invalid MONGODB_URI protocols and formats', () => {
    expect(() => {
      validateEnv({ ...validBaseEnv, MONGODB_URI: 'http://invalid-db-url' });
    }).toThrow(/Environment validation failed/);

    expect(() => {
      validateEnv({ ...validBaseEnv, MONGODB_URI: 'not-a-uri' });
    }).toThrow(/Environment validation failed/);
  });

  it('should reject invalid NODE_ENV values', () => {
    expect(() => {
      validateEnv({ ...validBaseEnv, NODE_ENV: 'staging' });
    }).toThrow(/Environment validation failed/);
  });

  it('should validate CORS_ORIGIN format', () => {
    // Malformed origin with trailing path
    expect(() => {
      validateEnv({ ...validBaseEnv, CORS_ORIGIN: 'http://localhost:3000/' });
    }).toThrow(/Environment validation failed/);

    // Empty origin
    expect(() => {
      validateEnv({ ...validBaseEnv, CORS_ORIGIN: '' });
    }).toThrow(/Environment validation failed/);
  });

  it('should enforce production security restrictions', () => {
    const validProdEnv = {
      NODE_ENV: 'production',
      PORT: '5000',
      HOST: '0.0.0.0',
      MONGODB_URI: 'mongodb://dbuser:secret@cluster0.mongodb.net/virtual_cse_lab',
      CORS_ORIGIN: 'https://virtualcselab.edu,https://app.virtualcselab.edu',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX: '100',
      LOG_LEVEL: 'info'
    };

    const parsedProd = validateEnv(validProdEnv);
    expect(parsedProd.NODE_ENV).toBe('production');

    // Wildcard origin rejected in production
    expect(() => {
      validateEnv({ ...validProdEnv, CORS_ORIGIN: '*' });
    }).toThrow(/Wildcard origin "\*" is prohibited in production/);

    // Test database URI rejected in production
    expect(() => {
      validateEnv({ ...validProdEnv, MONGODB_URI: 'mongodb://127.0.0.1:27017/virtual_cse_lab_test' });
    }).toThrow(/Production MONGODB_URI must not point to a test database/);
  });

  it('should enforce test database isolation in test environment', () => {
    expect(() => {
      validateEnv({
        ...validBaseEnv,
        NODE_ENV: 'test',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/virtual_cse_lab_production'
      });
    }).toThrow(/Test environment must use a dedicated test database/);
  });
});
