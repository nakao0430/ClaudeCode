import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

vi.mock('../../middleware/auth.middleware.js', () => ({
  verifyToken: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('../../middleware/cors.middleware.js', () => ({
  handleOptionsRequest: vi.fn().mockReturnValue({ statusCode: 200, headers: {}, body: '' }),
  addCorsHeaders: vi.fn().mockImplementation((res) => res),
}));

vi.mock('../../services/recipe.service.js', () => ({
  setFavorite: vi.fn(),
}));

const { favoriteHandler } = await import('../../handlers/favorite.handler.js');
const recipeService = await import('../../services/recipe.service.js');

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'PUT',
    headers: { Authorization: 'Bearer test-token', origin: 'http://localhost:4200' },
    path: '/recipes/recipe-1/favorite',
    body: null,
    isBase64Encoded: false,
    pathParameters: { id: 'recipe-1' },
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    ...overrides,
  };
}

describe('favoriteHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OPTIONS', () => {
    it('should handle CORS preflight', async () => {
      const result = await favoriteHandler(makeEvent({ httpMethod: 'OPTIONS' }));
      expect(result.statusCode).toBe(200);
    });
  });

  describe('PUT /recipes/{id}/favorite', () => {
    it('should set favorite to true', async () => {
      vi.mocked(recipeService.setFavorite).mockResolvedValue({
        userId: 'user-1',
        recipeId: 'recipe-1',
        title: 'テストレシピ',
        isFavorite: true,
      } as any);

      const result = await favoriteHandler(
        makeEvent({ body: JSON.stringify({ isFavorite: true }) })
      );

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).isFavorite).toBe(true);
      expect(recipeService.setFavorite).toHaveBeenCalledWith('user-1', 'recipe-1', true);
    });

    it('should set favorite to false', async () => {
      vi.mocked(recipeService.setFavorite).mockResolvedValue({
        userId: 'user-1',
        recipeId: 'recipe-1',
        title: 'テストレシピ',
        isFavorite: false,
      } as any);

      const result = await favoriteHandler(
        makeEvent({ body: JSON.stringify({ isFavorite: false }) })
      );

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).isFavorite).toBe(false);
    });

    it('should return 400 for missing body', async () => {
      const result = await favoriteHandler(makeEvent({ body: null }));
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid JSON', async () => {
      const result = await favoriteHandler(makeEvent({ body: '{bad' }));
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when isFavorite is not boolean', async () => {
      const result = await favoriteHandler(
        makeEvent({ body: JSON.stringify({ isFavorite: 'yes' }) })
      );
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when recipe ID is missing', async () => {
      const result = await favoriteHandler(
        makeEvent({ pathParameters: null, body: JSON.stringify({ isFavorite: true }) })
      );
      expect(result.statusCode).toBe(400);
    });
  });

  describe('unsupported methods', () => {
    it('should return 405 for GET', async () => {
      const result = await favoriteHandler(makeEvent({ httpMethod: 'GET' }));
      expect(result.statusCode).toBe(405);
    });

    it('should return 405 for DELETE', async () => {
      const result = await favoriteHandler(makeEvent({ httpMethod: 'DELETE' }));
      expect(result.statusCode).toBe(405);
    });
  });
});
