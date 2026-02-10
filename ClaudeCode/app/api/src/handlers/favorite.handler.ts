import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyToken } from '../middleware/auth.middleware.js';
import { handleError, createSuccessResponse, AppError } from '../middleware/error-handler.middleware.js';
import { addCorsHeaders, handleOptionsRequest } from '../middleware/cors.middleware.js';
import * as recipeService from '../services/recipe.service.js';

export async function favoriteHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return handleOptionsRequest(event);
    }

    // Verify authentication
    const userId = await verifyToken(event);

    // Get recipe ID from path parameters
    const recipeId = event.pathParameters?.id;
    if (!recipeId) {
      throw new AppError(400, 'Recipe ID is required');
    }

    // PUT /recipes/{id}/favorite - Set favorite status
    if (event.httpMethod === 'PUT') {
      if (!event.body) {
        throw new AppError(400, 'Request body is required');
      }

      let body: { isFavorite: boolean };
      try {
        body = JSON.parse(event.body);
      } catch {
        throw new AppError(400, 'Invalid JSON in request body');
      }

      if (typeof body.isFavorite !== 'boolean') {
        throw new AppError(400, 'isFavorite must be a boolean');
      }

      const recipe = await recipeService.setFavorite(userId, recipeId, body.isFavorite);
      return addCorsHeaders(createSuccessResponse(recipe), event);
    }

    // Method not allowed
    throw new AppError(405, 'Method not allowed');
  } catch (error) {
    return addCorsHeaders(handleError(error), event);
  }
}
