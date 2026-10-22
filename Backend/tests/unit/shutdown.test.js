import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  gracefulShutdown,
  _resetShutdownState,
  setServerInstance,
  startServer
} from '../../src/server.js';
import * as databaseModule from '../../src/config/database.js';

describe('Server Lifecycle & Graceful Shutdown (Unit)', () => {
  beforeEach(() => {
    _resetShutdownState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    _resetShutdownState();
    vi.restoreAllMocks();
  });

  it('should cleanly close server and database on graceful shutdown', async () => {
    let serverClosed = false;
    let idleClosed = false;

    const mockServer = {
      closeIdleConnections: vi.fn(() => {
        idleClosed = true;
      }),
      close: vi.fn((cb) => {
        serverClosed = true;
        cb(null);
      })
    };

    const disconnectSpy = vi.spyOn(databaseModule, 'disconnectDB').mockResolvedValue();
    setServerInstance(mockServer);

    const exitSpy = vi.fn();
    await gracefulShutdown('SIGTERM', 0, { exit: true, exitFn: exitSpy });

    expect(mockServer.closeIdleConnections).toHaveBeenCalled();
    expect(mockServer.close).toHaveBeenCalled();
    expect(serverClosed).toBe(true);
    expect(idleClosed).toBe(true);
    expect(disconnectSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should ignore duplicate shutdown calls when shutdown is already in progress', async () => {
    let closeCallCount = 0;
    const mockServer = {
      closeIdleConnections: vi.fn(),
      close: vi.fn((cb) => {
        closeCallCount++;
        // Delayed completion to test overlap
        setTimeout(() => cb(null), 10);
      })
    };

    vi.spyOn(databaseModule, 'disconnectDB').mockResolvedValue();
    setServerInstance(mockServer);

    const exitSpy = vi.fn();

    // Trigger two shutdown calls concurrently
    const p1 = gracefulShutdown('SIGTERM', 0, { exit: true, exitFn: exitSpy });
    const p2 = gracefulShutdown('SIGINT', 0, { exit: true, exitFn: exitSpy });

    await Promise.all([p1, p2]);

    expect(closeCallCount).toBe(1);
    expect(exitSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle database disconnect failure and exit with code 1', async () => {
    const mockServer = {
      closeIdleConnections: vi.fn(),
      close: vi.fn((cb) => cb(null))
    };

    vi.spyOn(databaseModule, 'disconnectDB').mockRejectedValue(new Error('DB disconnect failed'));
    setServerInstance(mockServer);

    const exitSpy = vi.fn();

    await expect(
      gracefulShutdown('SIGTERM', 0, { exit: true, exitFn: exitSpy })
    ).rejects.toThrow('DB disconnect failed');

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should cleanly handle startup failure when database connection fails', async () => {
    vi.spyOn(databaseModule, 'connectDB').mockRejectedValue(new Error('Connection refused'));
    const disconnectSpy = vi.spyOn(databaseModule, 'disconnectDB').mockResolvedValue();

    const exitSpy = vi.fn();

    await expect(
      startServer({ exitOnFailure: true, exitFn: exitSpy })
    ).rejects.toThrow('Connection refused');

    expect(disconnectSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
