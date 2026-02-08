import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyToken } from '../middleware/auth.middleware.js';
import { handleError, createSuccessResponse, AppError } from '../middleware/error-handler.middleware.js';
import { addCorsHeaders, handleOptionsRequest } from '../middleware/cors.middleware.js';
import * as recipeService from '../services/recipe.service.js';
import type { UpdateRecipeRequest } from '../models/recipe.model.js';

export async function recipeHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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

    // GET /recipes/{id} - Get recipe by ID
    if (event.httpMethod === 'GET') {
      const recipe = await recipeService.getById(userId, recipeId);
      return addCorsHeaders(createSuccessResponse(recipe), event);
    }

    // PUT /recipes/{id} - Update recipe
    if (event.httpMethod === 'PUT') {
      if (!event.body) {
        throw new AppError(400, 'Request body is required');
      }

      let request: UpdateRecipeRequest;
      try {
        request = JSON.parse(event.body);
      } catch {
        throw new AppError(400, 'Invalid JSON in request body');
      }
      const recipe = await recipeService.update(userId, recipeId, request);

      return addCorsHeaders(createSuccessResponse(recipe), event);
    }

    // DELETE /recipes/{id} - Delete recipe
    if (event.httpMethod === 'DELETE') {
      await recipeService.deleteRecipe(userId, recipeId);
      return addCorsHeaders(
        {
          statusCode: 204,
          headers: {
            'Content-Type': 'application/json',
          },
          body: '',
        },
        event
      );
    }

    // Method not allowed
    throw new AppError(405, 'Method not allowed');
  } catch (error) {
    return addCorsHeaders(handleError(error), event);
  }
}
