import { describe, it, expect } from 'vitest';
import { AppError } from '../../src/utils/AppError.js';

describe('AppError Utility (Unit)', () => {
  it('should initialize with default parameters', () => {
    const error = new AppError('Something broke');
    expect(error.message).toBe('Something broke');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.isOperational).toBe(true);
    expect(error.details).toBeNull();
  });

  it('should create operational 400 Bad Request', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const error = AppError.badRequest('Invalid input', details);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.details).toEqual(details);
    expect(error.isOperational).toBe(true);
  });

  it('should create operational 401 Unauthorized', () => {
    const error = AppError.unauthorized('Token expired');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should create operational 403 Forbidden', () => {
    const error = AppError.forbidden('Access denied');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('should create operational 404 Not Found', () => {
    const error = AppError.notFound('Resource missing');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should create non-operational 500 Internal Error', () => {
    const error = AppError.internal('Database crash');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.isOperational).toBe(false);
  });
});
