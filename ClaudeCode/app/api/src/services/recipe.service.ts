import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import { docClient } from '../config/dynamodb.config.js';
import { AppError } from '../middleware/error-handler.middleware.js';
import type { Recipe, RecipeListResponse, CreateRecipeRequest, UpdateRecipeRequest, IngredientGroup, Ingredient } from '../models/recipe.model.js';

const TABLE_NAME = process.env.RECIPES_TABLE || '';

const LIMITS = {
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 5000,
  MAX_INGREDIENTS: 100,
  MAX_INGREDIENT_GROUPS: 20,
  MAX_STEPS: 50,
  MAX_TAGS: 20,
  MAX_CATEGORIES: 10,
  TAG_MAX_LENGTH: 50,
  INGREDIENT_NAME_MAX_LENGTH: 200,
  INGREDIENT_AMOUNT_MAX_LENGTH: 50,
  GROUP_LABEL_MAX_LENGTH: 100,
  STEP_DESCRIPTION_MAX_LENGTH: 2000,
  MAX_COOKING_TIME: 10000,
  MAX_SERVINGS: 1000,
  MAX_QUERY_LIMIT: 100,
  IMAGE_URL_MAX_LENGTH: 500,
};

function normalizeIngredientGroups(recipe: any): IngredientGroup[] {
  if (recipe.ingredientGroups && Array.isArray(recipe.ingredientGroups) && recipe.ingredientGroups.length > 0) {
    return recipe.ingredientGroups;
  }
  if (recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
    return [{ groupLabel: '', ingredients: recipe.ingredients }];
  }
  return [{ groupLabel: '', ingredients: [] }];
}

function flattenIngredientGroups(groups: IngredientGroup[]): Ingredient[] {
  return groups.flatMap(g => g.ingredients);
}

function validateRecipeInput(request: CreateRecipeRequest | UpdateRecipeRequest, isCreate: boolean): void {
  if (isCreate) {
    const req = request as CreateRecipeRequest;
    if (!req.title || !req.description || !req.steps) {
      throw new AppError(400, 'Title, description, and steps are required');
    }
    const hasIngredientGroups = req.ingredientGroups && req.ingredientGroups.length > 0 &&
      req.ingredientGroups.some(g => g.ingredients.length > 0);
    const hasIngredients = req.ingredients && req.ingredients.length > 0;
    if (!hasIngredientGroups && !hasIngredients) {
      throw new AppError(400, 'At least one ingredient is required');
    }
    if (req.steps.length === 0) {
      throw new AppError(400, 'At least one step is required');
    }
  }

  if (request.title !== undefined) {
    if (typeof request.title !== 'string' || request.title.length > LIMITS.TITLE_MAX_LENGTH) {
      throw new AppError(400, `Title must be a string with max ${LIMITS.TITLE_MAX_LENGTH} characters`);
    }
  }

  if (request.description !== undefined) {
    if (typeof request.description !== 'string' || request.description.length > LIMITS.DESCRIPTION_MAX_LENGTH) {
      throw new AppError(400, `Description must be a string with max ${LIMITS.DESCRIPTION_MAX_LENGTH} characters`);
    }
  }

  if (request.ingredientGroups !== undefined) {
    if (!Array.isArray(request.ingredientGroups) || request.ingredientGroups.length > LIMITS.MAX_INGREDIENT_GROUPS) {
      throw new AppError(400, `Ingredient groups must be an array with max ${LIMITS.MAX_INGREDIENT_GROUPS} items`);
    }
    let totalIngredients = 0;
    for (const group of request.ingredientGroups) {
      if (group.groupLabel && group.groupLabel.length > LIMITS.GROUP_LABEL_MAX_LENGTH) {
        throw new AppError(400, `Group label must be max ${LIMITS.GROUP_LABEL_MAX_LENGTH} characters`);
      }
      if (!Array.isArray(group.ingredients)) {
        throw new AppError(400, 'Each ingredient group must have an ingredients array');
      }
      totalIngredients += group.ingredients.length;
      for (const ingredient of group.ingredients) {
        if (!ingredient.name || typeof ingredient.name !== 'string' || ingredient.name.length > LIMITS.INGREDIENT_NAME_MAX_LENGTH) {
          throw new AppError(400, 'Each ingredient must have a valid name');
        }
        if (ingredient.amount && ingredient.amount.length > LIMITS.INGREDIENT_AMOUNT_MAX_LENGTH) {
          throw new AppError(400, 'Ingredient amount is too long');
        }
      }
    }
    if (totalIngredients > LIMITS.MAX_INGREDIENTS) {
      throw new AppError(400, `Total ingredients must be max ${LIMITS.MAX_INGREDIENTS} items`);
    }
  }

  if (request.ingredients !== undefined && !request.ingredientGroups) {
    if (!Array.isArray(request.ingredients) || request.ingredients.length > LIMITS.MAX_INGREDIENTS) {
      throw new AppError(400, `Ingredients must be an array with max ${LIMITS.MAX_INGREDIENTS} items`);
    }
    for (const ingredient of request.ingredients) {
      if (!ingredient.name || typeof ingredient.name !== 'string' || ingredient.name.length > LIMITS.INGREDIENT_NAME_MAX_LENGTH) {
        throw new AppError(400, 'Each ingredient must have a valid name');
      }
      if (ingredient.amount && ingredient.amount.length > LIMITS.INGREDIENT_AMOUNT_MAX_LENGTH) {
        throw new AppError(400, 'Ingredient amount is too long');
      }
    }
  }

  if (request.steps !== undefined) {
    if (!Array.isArray(request.steps) || request.steps.length > LIMITS.MAX_STEPS) {
      throw new AppError(400, `Steps must be an array with max ${LIMITS.MAX_STEPS} items`);
    }
    for (const step of request.steps) {
      if (!step.description || typeof step.description !== 'string' || step.description.length > LIMITS.STEP_DESCRIPTION_MAX_LENGTH) {
        throw new AppError(400, 'Each step must have a valid description');
      }
    }
  }

  if (request.tags !== undefined) {
    if (!Array.isArray(request.tags) || request.tags.length > LIMITS.MAX_TAGS) {
      throw new AppError(400, `Tags must be an array with max ${LIMITS.MAX_TAGS} items`);
    }
    for (const tag of request.tags) {
      if (typeof tag !== 'string' || tag.length > LIMITS.TAG_MAX_LENGTH) {
        throw new AppError(400, `Each tag must be a string with max ${LIMITS.TAG_MAX_LENGTH} characters`);
      }
    }
  }

  if (request.categories !== undefined) {
    if (!Array.isArray(request.categories) || request.categories.length > LIMITS.MAX_CATEGORIES) {
      throw new AppError(400, `Categories must be an array with max ${LIMITS.MAX_CATEGORIES} items`);
    }
  }

  if (request.cookingTime !== undefined) {
    if (typeof request.cookingTime !== 'number' || request.cookingTime < 0 || request.cookingTime > LIMITS.MAX_COOKING_TIME) {
      throw new AppError(400, `Cooking time must be a number between 0 and ${LIMITS.MAX_COOKING_TIME}`);
    }
  }

  if (request.servings !== undefined) {
    if (typeof request.servings !== 'number' || request.servings < 1 || request.servings > LIMITS.MAX_SERVINGS) {
      throw new AppError(400, `Servings must be a number between 1 and ${LIMITS.MAX_SERVINGS}`);
    }
  }

  if (request.imageUrl !== undefined && request.imageUrl !== null) {
    if (typeof request.imageUrl !== 'string' || request.imageUrl.length > LIMITS.IMAGE_URL_MAX_LENGTH) {
      throw new AppError(400, 'Invalid image URL');
    }
    if (request.imageUrl && !request.imageUrl.startsWith('https://')) {
      throw new AppError(400, 'Image URL must use HTTPS');
    }
  }
}

export async function listByUserId(
  userId: string,
  options: {
    q?: string;
    limit?: number;
    nextToken?: string;
    favoritesOnly?: boolean;
  } = {}
): Promise<RecipeListResponse> {
  const { q, limit: rawLimit = 20, nextToken, favoritesOnly } = options;

  // Validate and clamp limit
  const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 20), LIMITS.MAX_QUERY_LIMIT);

  // Validate and parse nextToken
  let exclusiveStartKey: Record<string, any> | undefined;
  if (nextToken) {
    try {
      const parsed = JSON.parse(Buffer.from(nextToken, 'base64').toString());
      // Ensure the userId in the token matches the requesting user
      if (parsed.userId !== userId) {
        throw new AppError(400, 'Invalid pagination token');
      }
      exclusiveStartKey = parsed;
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(400, 'Invalid pagination token');
    }
  }

  try {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Sort by createdAt descending
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });

    const result = await docClient.send(command);
    let items = (result.Items || []) as Recipe[];

    // Normalize ingredientGroups for backward compatibility
    for (const item of items) {
      item.ingredientGroups = normalizeIngredientGroups(item);
    }

    // Client-side filtering if search query provided
    if (q) {
      const searchLower = q.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          item.categories.some((cat) => cat.toLowerCase().includes(searchLower)) ||
          (item.ingredientGroups || []).some((g) => g.ingredients.some((ing) => ing.name.toLowerCase().includes(searchLower)))
      );
    }

    // Filter favorites only
    if (favoritesOnly) {
      items = items.filter((item) => item.isFavorite === true);
    }

    const response: RecipeListResponse = {
      items,
    };

    if (result.LastEvaluatedKey) {
      response.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return response;
  } catch (error) {
    console.error('Error listing recipes:', error);
    throw new AppError(500, 'Failed to list recipes');
  }
}

export async function getById(userId: string, recipeId: string): Promise<Recipe> {
  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        userId,
        recipeId,
      },
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      throw new AppError(404, 'Recipe not found');
    }

    const recipe = result.Item as Recipe;
    recipe.ingredientGroups = normalizeIngredientGroups(recipe);
    return recipe;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error getting recipe:', error);
    throw new AppError(500, 'Failed to get recipe');
  }
}

export async function create(userId: string, request: CreateRecipeRequest): Promise<Recipe> {
  validateRecipeInput(request, true);

  const now = new Date().toISOString();
  const ingredientGroups = request.ingredientGroups && request.ingredientGroups.length > 0
    ? request.ingredientGroups
    : [{ groupLabel: '', ingredients: request.ingredients }];
  const recipe: Recipe = {
    userId,
    recipeId: ulid(),
    title: request.title,
    description: request.description,
    ingredients: flattenIngredientGroups(ingredientGroups),
    ingredientGroups,
    steps: request.steps,
    categories: request.categories || [],
    tags: request.tags || [],
    cookingTime: request.cookingTime,
    servings: request.servings,
    imageUrl: request.imageUrl,
    comment: request.comment,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: recipe,
    });

    await docClient.send(command);
    return recipe;
  } catch (error) {
    console.error('Error creating recipe:', error);
    throw new AppError(500, 'Failed to create recipe');
  }
}

export async function update(
  userId: string,
  recipeId: string,
  request: UpdateRecipeRequest
): Promise<Recipe> {
  validateRecipeInput(request, false);

  // First verify the recipe exists and belongs to the user
  await getById(userId, recipeId);

  const now = new Date().toISOString();
  const updateExpressions: string[] = ['updatedAt = :updatedAt'];
  const expressionAttributeValues: any = {
    ':updatedAt': now,
  };
  const expressionAttributeNames: any = {};

  if (request.title !== undefined) {
    updateExpressions.push('title = :title');
    expressionAttributeValues[':title'] = request.title;
  }

  if (request.description !== undefined) {
    updateExpressions.push('description = :description');
    expressionAttributeValues[':description'] = request.description;
  }

  if (request.ingredientGroups !== undefined) {
    const groups = request.ingredientGroups;
    updateExpressions.push('ingredientGroups = :ingredientGroups');
    expressionAttributeValues[':ingredientGroups'] = groups;
    updateExpressions.push('ingredients = :ingredients');
    expressionAttributeValues[':ingredients'] = flattenIngredientGroups(groups);
  } else if (request.ingredients !== undefined) {
    updateExpressions.push('ingredients = :ingredients');
    expressionAttributeValues[':ingredients'] = request.ingredients;
    updateExpressions.push('ingredientGroups = :ingredientGroups');
    expressionAttributeValues[':ingredientGroups'] = [{ groupLabel: '', ingredients: request.ingredients }];
  }

  if (request.steps !== undefined) {
    updateExpressions.push('steps = :steps');
    expressionAttributeValues[':steps'] = request.steps;
  }

  if (request.categories !== undefined) {
    updateExpressions.push('categories = :categories');
    expressionAttributeValues[':categories'] = request.categories;
  }

  if (request.tags !== undefined) {
    updateExpressions.push('tags = :tags');
    expressionAttributeValues[':tags'] = request.tags;
  }

  if (request.cookingTime !== undefined) {
    updateExpressions.push('cookingTime = :cookingTime');
    expressionAttributeValues[':cookingTime'] = request.cookingTime;
  }

  if (request.servings !== undefined) {
    updateExpressions.push('servings = :servings');
    expressionAttributeValues[':servings'] = request.servings;
  }

  if (request.imageUrl !== undefined) {
    updateExpressions.push('imageUrl = :imageUrl');
    expressionAttributeValues[':imageUrl'] = request.imageUrl;
  }

  if (request.comment !== undefined) {
    updateExpressions.push('#comment = :comment');
    expressionAttributeValues[':comment'] = request.comment;
    expressionAttributeNames['#comment'] = 'comment';
  }

  try {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        userId,
        recipeId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames }),
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(command);
    return result.Attributes as Recipe;
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw new AppError(500, 'Failed to update recipe');
  }
}

export async function setFavorite(userId: string, recipeId: string, isFavorite: boolean): Promise<Recipe> {
  // Verify the recipe exists and belongs to the user
  await getById(userId, recipeId);

  try {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        userId,
        recipeId,
      },
      UpdateExpression: 'SET isFavorite = :isFavorite',
      ExpressionAttributeValues: {
        ':isFavorite': isFavorite,
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(command);
    return result.Attributes as Recipe;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error setting favorite:', error);
    throw new AppError(500, 'Failed to update favorite status');
  }
}

export async function deleteRecipe(userId: string, recipeId: string): Promise<void> {
  // First verify the recipe exists and belongs to the user
  await getById(userId, recipeId);

  try {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        userId,
        recipeId,
      },
    });

    await docClient.send(command);
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw new AppError(500, 'Failed to delete recipe');
  }
}
