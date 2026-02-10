import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock dependencies
vi.mock('../../middleware/auth.middleware.js', () => ({
  verifyToken: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('../../middleware/cors.middleware.js', () => ({
  handleOptionsRequest: vi.fn().mockReturnValue({ statusCode: 200, headers: {}, body: '' }),
  addCorsHeaders: vi.fn().mockImplementation((res) => res),
}));

vi.mock('../../services/recipe.service.js', () => ({
  listByUserId: vi.fn(),
  create: vi.fn(),
}));

vi.stubEnv('ALLOWED_ORIGINS', 'http://localhost:4200');

const { recipesHandler } = await import('../../handlers/recipes.handler.js');
const recipeService = await import('../../services/recipe.service.js');
const { verifyToken } = await import('../../middleware/auth.middleware.js');

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    headers: { Authorization: 'Bearer test-token', origin: 'http://localhost:4200' },
    path: '/recipes',
    body: null,
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    ...overrides,
  };
}

describe('recipesHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OPTIONS', () => {
    it('should handle CORS preflight', async () => {
      const result = await recipesHandler(makeEvent({ httpMethod: 'OPTIONS' }));
      expect(result.statusCode).toBe(200);
    });
  });

  describe('GET /recipes', () => {
    it('should list recipes', async () => {
      vi.mocked(recipeService.listByUserId).mockResolvedValue({
        items: [{ title: 'テスト' } as any],
      });

      const result = await recipesHandler(makeEvent());
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).items).toHaveLength(1);
    });

    it('should pass query parameters', async () => {
      vi.mocked(recipeService.listByUserId).mockResolvedValue({ items: [] });

      await recipesHandler(
        makeEvent({
          queryStringParameters: { q: '鶏肉', limit: '10', nextToken: 'abc' },
        })
      );

      expect(recipeService.listByUserId).toHaveBeenCalledWith('user-1', {
        q: '鶏肉',
        limit: 10,
        nextToken: 'abc',
        favoritesOnly: false,
      });
    });
  });

  describe('POST /recipes', () => {
    it('should create a recipe', async () => {
      const newRecipe = {
        title: '新レシピ',
        description: '説明',
        ingredients: [{ name: '材料', amount: '1', unit: '個' }],
        steps: [{ stepNumber: 1, description: 'ステップ1' }],
        categories: [],
        tags: [],
      };

      vi.mocked(recipeService.create).mockResolvedValue({
        ...newRecipe,
        userId: 'user-1',
        recipeId: 'new-id',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      });

      const result = await recipesHandler(
        makeEvent({ httpMethod: 'POST', body: JSON.stringify(newRecipe) })
      );

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body).title).toBe('新レシピ');
    });

    it('should return 400 for missing body', async () => {
      const result = await recipesHandler(
        makeEvent({ httpMethod: 'POST', body: null })
      );
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid JSON', async () => {
      const result = await recipesHandler(
        makeEvent({ httpMethod: 'POST', body: '{invalid' })
      );
      expect(result.statusCode).toBe(400);
    });
  });

  describe('unsupported methods', () => {
    it('should return 405 for PUT', async () => {
      const result = await recipesHandler(makeEvent({ httpMethod: 'PUT' }));
      expect(result.statusCode).toBe(405);
    });
  });
});
