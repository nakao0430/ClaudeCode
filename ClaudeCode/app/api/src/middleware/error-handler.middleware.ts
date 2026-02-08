import type { APIGatewayProxyResult } from 'aws-lambda';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function handleError(error: unknown): APIGatewayProxyResult {
  console.error('Error:', error);

  if (error instanceof AppError && error.isOperational) {
    return {
      statusCode: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }

  // Unexpected errors
  return {
    statusCode: 500,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'Internal server error',
    }),
  };
}

export function createSuccessResponse(
  data: any,
  statusCode: number = 200
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
}
