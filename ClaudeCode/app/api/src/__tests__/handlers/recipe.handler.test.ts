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
  getById: vi.fn(),
  update: vi.fn(),
  deleteRecipe: vi.fn(),
}));

const { recipeHandler } = await import('../../handlers/recipe.handler.js');
const recipeService = await import('../../services/recipe.service.js');

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    headers: { Authorization: 'Bearer test-token', origin: 'http://localhost:4200' },
    path: '/recipes/recipe-1',
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

describe('recipeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when recipe ID is missing', async () => {
    const result = await recipeHandler(
      makeEvent({ pathParameters: null })
    );
    expect(result.statusCode).toBe(400);
  });

  describe('GET /recipes/:id', () => {
    it('should return a recipe', async () => {
      vi.mocked(recipeService.getById).mockResolvedValue({
        userId: 'user-1',
        recipeId: 'recipe-1',
        title: 'テストレシピ',
      } as any);

      const result = await recipeHandler(makeEvent());
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).title).toBe('テストレシピ');
    });
  });

  describe('PUT /recipes/:id', () => {
    it('should update a recipe', async () => {
      vi.mocked(recipeService.update).mockResolvedValue({
        userId: 'user-1',
        recipeId: 'recipe-1',
        title: '更新済み',
      } as any);

      const result = await recipeHandler(
        makeEvent({
          httpMethod: 'PUT',
          body: JSON.stringify({ title: '更新済み' }),
        })
      );
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).title).toBe('更新済み');
    });

    it('should return 400 for missing body', async () => {
      const result = await recipeHandler(
        makeEvent({ httpMethod: 'PUT', body: null })
      );
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid JSON', async () => {
      const result = await recipeHandler(
        makeEvent({ httpMethod: 'PUT', body: 'not-json' })
      );
      expect(result.statusCode).toBe(400);
    });
  });

  describe('DELETE /recipes/:id', () => {
    it('should delete a recipe and return 204', async () => {
      vi.mocked(recipeService.deleteRecipe).mockResolvedValue();

      const result = await recipeHandler(
        makeEvent({ httpMethod: 'DELETE' })
      );
      expect(result.statusCode).toBe(204);
    });
  });

  describe('unsupported methods', () => {
    it('should return 405 for POST', async () => {
      const result = await recipeHandler(makeEvent({ httpMethod: 'POST' }));
      expect(result.statusCode).toBe(405);
    });
  });
});
