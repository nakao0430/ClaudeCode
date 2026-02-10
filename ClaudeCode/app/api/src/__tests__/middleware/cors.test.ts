import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Set env before importing
vi.stubEnv('ALLOWED_ORIGINS', 'http://localhost:4200,https://example.com');

const { getCorsHeaders, handleOptionsRequest, addCorsHeaders } = await import(
  '../../middleware/cors.middleware.js'
);

function makeEvent(origin: string): APIGatewayProxyEvent {
  return {
    headers: { origin },
    httpMethod: 'GET',
    path: '/',
    body: null,
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  };
}

describe('getCorsHeaders', () => {
  it('should return origin if it is in the allowed list', () => {
    const headers = getCorsHeaders(makeEvent('http://localhost:4200'));
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:4200');
  });

  it('should return empty origin if not allowed', () => {
    const headers = getCorsHeaders(makeEvent('http://evil.com'));
    expect(headers['Access-Control-Allow-Origin']).toBe('');
  });

  it('should include standard CORS headers', () => {
    const headers = getCorsHeaders(makeEvent('https://example.com'));
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type,Authorization');
    expect(headers['Access-Control-Allow-Methods']).toBe('GET,POST,PUT,DELETE,OPTIONS');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });
});

describe('handleOptionsRequest', () => {
  it('should return 200 with CORS headers', () => {
    const result = handleOptionsRequest(makeEvent('http://localhost:4200'));
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('');
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('http://localhost:4200');
  });
});

describe('addCorsHeaders', () => {
  it('should merge CORS headers into existing response', () => {
    const response = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    };
    const result = addCorsHeaders(response, makeEvent('https://example.com'));
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Content-Type']).toBe('application/json');
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('https://example.com');
  });
});
