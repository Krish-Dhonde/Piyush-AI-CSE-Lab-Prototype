import { describe, it, expect, afterAll } from 'vitest';
import {
  connectDB,
  disconnectDB,
  isDatabaseReady,
  getDatabaseState,
  assertTestDatabase,
  sanitizeMongoUri,
  sanitizeError
} from '../../src/config/database.js';
import { env } from '../../src/config/env.js';

describe('MongoDB Connection Lifecycle & Safety (Integration)', () => {
  afterAll(async () => {
    await disconnectDB();
  });

  it('should report disconnected state initially if not connected', async () => {
    await disconnectDB();
    expect(isDatabaseReady()).toBe(false);
    expect(getDatabaseState()).toBe('disconnected');
  });

  it('should successfully establish connection to isolated test database', async () => {
    await connectDB(env.MONGODB_URI);
    expect(isDatabaseReady()).toBe(true);
    expect(getDatabaseState()).toBe('connected');
  });

  it('should share in-flight promise across concurrent connectDB calls', async () => {
    await disconnectDB();

    // Fire 3 simultaneous connect calls
    const [conn1, conn2, conn3] = await Promise.all([
      connectDB(env.MONGODB_URI),
      connectDB(env.MONGODB_URI),
      connectDB(env.MONGODB_URI)
    ]);

    expect(conn1).toBe(conn2);
    expect(conn2).toBe(conn3);
    expect(isDatabaseReady()).toBe(true);
  });

  it('should handle duplicate connectDB calls idempotently when already connected', async () => {
    const conn1 = await connectDB(env.MONGODB_URI);
    const conn2 = await connectDB(env.MONGODB_URI);
    expect(conn1).toBe(conn2);
    expect(isDatabaseReady()).toBe(true);
  });

  it('should ensure all concurrent callers observe connection failure on bad connection', async () => {
    await disconnectDB();

    // Use an invalid port on loopback with short timeout (safe, isolated test URI)
    const badUri = 'mongodb://127.0.0.1:27099/test_db';

    const results = await Promise.allSettled([
      connectDB(badUri, { serverSelectionTimeoutMS: 500 }),
      connectDB(badUri, { serverSelectionTimeoutMS: 500 })
    ]);

    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    expect(isDatabaseReady()).toBe(false);
  });

  it('should allow successful retry after a failed connection attempt', async () => {
    await disconnectDB();

    // First attempt fails quickly
    try {
      await connectDB('mongodb://127.0.0.1:27099/test_db', { serverSelectionTimeoutMS: 500 });
    } catch {
      // Expected failure
    }

    // Subsequent attempt with valid test URI succeeds
    const recovered = await connectDB(env.MONGODB_URI);
    expect(recovered).toBeDefined();
    expect(isDatabaseReady()).toBe(true);
  });

  it('should enforce test database isolation and reject non-test databases', () => {
    expect(() => {
      assertTestDatabase('mongodb://127.0.0.1:27017/virtual_cse_lab');
    }).toThrow(/Database safety violation/);

    expect(() => {
      assertTestDatabase('mongodb://produser:secret@cluster0.mongodb.net/production');
    }).toThrow(/Database safety violation/);

    expect(() => {
      assertTestDatabase('mongodb://127.0.0.1:27017/virtual_cse_lab_test');
    }).not.toThrow();
  });

  it('should sanitize credentials from URIs and error objects', () => {
    const rawUri = 'mongodb://appUser:SuperSecret123@cluster0.mongodb.net/test';
    const sanitizedUri = sanitizeMongoUri(rawUri);
    expect(sanitizedUri).not.toContain('SuperSecret123');
    expect(sanitizedUri).toBe('mongodb://appUser:[REDACTED]@cluster0.mongodb.net/test');

    const error = new Error(`Connection failed for ${rawUri}`);
    const sanitizedErr = sanitizeError(error);
    expect(sanitizedErr.message).not.toContain('SuperSecret123');
    expect(sanitizedErr.message).toContain('[REDACTED]');
  });

  it('should cleanly disconnect from MongoDB', async () => {
    await disconnectDB();
    expect(isDatabaseReady()).toBe(false);
    expect(getDatabaseState()).toBe('disconnected');
  });
});

