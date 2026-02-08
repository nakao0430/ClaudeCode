import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || [];

export function getCorsHeaders(event: APIGatewayProxyEvent): Record<string, string> {
  const origin = event.headers.origin || event.headers.Origin || '';

  // Only allow specific origins, never wildcard
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleOptionsRequest(event: APIGatewayProxyEvent): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: getCorsHeaders(event),
    body: '',
  };
}

export function addCorsHeaders(
  response: APIGatewayProxyResult,
  event: APIGatewayProxyEvent
): APIGatewayProxyResult {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...getCorsHeaders(event),
    },
  };
}
