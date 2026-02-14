import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyToken } from '../middleware/auth.middleware.js';
import { handleError, createSuccessResponse, AppError } from '../middleware/error-handler.middleware.js';
import { addCorsHeaders, handleOptionsRequest } from '../middleware/cors.middleware.js';
import * as scrapeService from '../services/scrape.service.js';
import type { ScrapeRequest } from '../services/scrape.service.js';

export async function scrapeHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return handleOptionsRequest(event);
    }

    // Verify authentication
    await verifyToken(event);

    // POST /recipes/scrape - Scrape recipe from URL
    if (event.httpMethod === 'POST') {
      if (!event.body) {
        throw new AppError(400, 'Request body is required');
      }

      let request: ScrapeRequest;
      try {
        request = JSON.parse(event.body);
      } catch {
        throw new AppError(400, 'Invalid JSON in request body');
      }

      if (!request.url) {
        throw new AppError(400, 'url is required');
      }

      const result = await scrapeService.scrapeRecipe(request);

      return addCorsHeaders(createSuccessResponse(result), event);
    }

    // Method not allowed
    throw new AppError(405, 'Method not allowed');
  } catch (error) {
    return addCorsHeaders(handleError(error), event);
  }
}
