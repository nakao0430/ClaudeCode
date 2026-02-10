import { describe, it, expect } from 'vitest';
import { AppError, handleError, createSuccessResponse } from '../../middleware/error-handler.middleware.js';

describe('AppError', () => {
  it('should create an instance with statusCode and message', () => {
    const error = new AppError(400, 'Bad Request');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad Request');
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should support non-operational errors', () => {
    const error = new AppError(500, 'Internal', false);
    expect(error.isOperational).toBe(false);
  });
});

describe('handleError', () => {
  it('should return proper response for operational AppError', () => {
    const error = new AppError(404, 'Not found');
    const result = handleError(error);
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ error: 'Not found' });
    expect(result.headers?.['Content-Type']).toBe('application/json');
  });

  it('should return 500 for non-operational AppError', () => {
    const error = new AppError(400, 'secret info', false);
    const result = handleError(error);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'Internal server error' });
  });

  it('should return 500 for unknown errors', () => {
    const result = handleError(new Error('unexpected'));
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'Internal server error' });
  });

  it('should return 500 for non-Error objects', () => {
    const result = handleError('string error');
    expect(result.statusCode).toBe(500);
  });
});

describe('createSuccessResponse', () => {
  it('should create a 200 response by default', () => {
    const data = { items: [] };
    const result = createSuccessResponse(data);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(data);
    expect(result.headers?.['Content-Type']).toBe('application/json');
  });

  it('should accept custom status code', () => {
    const result = createSuccessResponse({ id: '123' }, 201);
    expect(result.statusCode).toBe(201);
  });
});
