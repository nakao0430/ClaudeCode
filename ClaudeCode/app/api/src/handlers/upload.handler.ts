import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyToken } from '../middleware/auth.middleware.js';
import { handleError, createSuccessResponse, AppError } from '../middleware/error-handler.middleware.js';
import { addCorsHeaders, handleOptionsRequest } from '../middleware/cors.middleware.js';
import * as uploadService from '../services/upload.service.js';
import type { UploadUrlRequest } from '../services/upload.service.js';

export async function uploadHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return handleOptionsRequest(event);
    }

    // Verify authentication
    const userId = await verifyToken(event);

    // POST /recipes/upload-url - Generate signed URL
    if (event.httpMethod === 'POST') {
      if (!event.body) {
        throw new AppError(400, 'Request body is required');
      }

      let request: UploadUrlRequest;
      try {
        request = JSON.parse(event.body);
      } catch {
        throw new AppError(400, 'Invalid JSON in request body');
      }

      if (!request.filename || !request.contentType) {
        throw new AppError(400, 'filename and contentType are required');
      }

      const result = await uploadService.generateUploadUrl(userId, request);

      return addCorsHeaders(createSuccessResponse(result), event);
    }

    // Method not allowed
    throw new AppError(405, 'Method not allowed');
  } catch (error) {
    return addCorsHeaders(handleError(error), event);
  }
}
