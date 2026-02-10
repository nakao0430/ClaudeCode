import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyToken } from '../middleware/auth.middleware.js';
import { handleError, createSuccessResponse, AppError } from '../middleware/error-handler.middleware.js';
import { addCorsHeaders, handleOptionsRequest } from '../middleware/cors.middleware.js';
import * as recipeService from '../services/recipe.service.js';
import type { CreateRecipeRequest } from '../models/recipe.model.js';

export async function recipesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return handleOptionsRequest(event);
    }

    // Verify authentication
    const userId = await verifyToken(event);

    // GET /recipes - List recipes
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters?.q;
      const limit = event.queryStringParameters?.limit
        ? parseInt(event.queryStringParameters.limit)
        : undefined;
      const nextToken = event.queryStringParameters?.nextToken;
      const favoritesOnly = event.queryStringParameters?.favorites === 'true';

      const result = await recipeService.listByUserId(userId, {
        q,
        limit,
        nextToken,
        favoritesOnly,
      });

      return addCorsHeaders(createSuccessResponse(result), event);
    }

    // POST /recipes - Create recipe
    if (event.httpMethod === 'POST') {
      if (!event.body) {
        throw new AppError(400, 'Request body is required');
      }

      let request: CreateRecipeRequest;
      try {
        request = JSON.parse(event.body);
      } catch {
        throw new AppError(400, 'Invalid JSON in request body');
      }
      const recipe = await recipeService.create(userId, request);

      return addCorsHeaders(createSuccessResponse(recipe, 201), event);
    }

    // Method not allowed
    throw new AppError(405, 'Method not allowed');
  } catch (error) {
    return addCorsHeaders(handleError(error), event);
  }
}
