import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DynamoDB client
const mockSend = vi.fn();
vi.mock('../../config/dynamodb.config.js', () => ({
  docClient: { send: (...args: any[]) => mockSend(...args) },
}));

vi.stubEnv('RECIPES_TABLE', 'test-recipes');

const recipeService = await import('../../services/recipe.service.js');

function makeRecipe(overrides: Record<string, any> = {}) {
  return {
    userId: 'user-1',
    recipeId: 'recipe-1',
    title: 'カレーライス',
    description: 'スパイシーなカレー',
    ingredients: [
      { name: '鶏肉', amount: '300', unit: 'g' },
      { name: '玉ねぎ', amount: '2', unit: '個' },
    ],
    steps: [{ stepNumber: 1, description: '材料を切る' }],
    categories: ['メイン'],
    tags: ['スパイシー'],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('listByUserId', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('should return items from DynamoDB', async () => {
    const recipe = makeRecipe();
    mockSend.mockResolvedValue({ Items: [recipe] });

    const result = await recipeService.listByUserId('user-1');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('カレーライス');
    expect(result.nextToken).toBeUndefined();
  });

  it('should return nextToken when LastEvaluatedKey exists', async () => {
    mockSend.mockResolvedValue({
      Items: [makeRecipe()],
      LastEvaluatedKey: { userId: 'user-1', recipeId: 'recipe-1', createdAt: '2025-01-01' },
    });

    const result = await recipeService.listByUserId('user-1');
    expect(result.nextToken).toBeDefined();
    const decoded = JSON.parse(Buffer.from(result.nextToken!, 'base64').toString());
    expect(decoded.userId).toBe('user-1');
  });

  it('should filter by title', async () => {
    const salad = makeRecipe({
      recipeId: 'recipe-2', title: 'サラダ', description: '新鮮な野菜',
      ingredients: [{ name: 'レタス', amount: '1', unit: '個' }], tags: ['ヘルシー'], categories: ['サイド'],
    });
    mockSend.mockResolvedValue({ Items: [makeRecipe(), salad] });

    const result = await recipeService.listByUserId('user-1', { q: 'カレー' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('カレーライス');
  });

  it('should filter by description', async () => {
    const salad = makeRecipe({
      recipeId: 'recipe-2', title: 'サラダ', description: '新鮮な野菜',
      ingredients: [{ name: 'レタス', amount: '1', unit: '個' }], tags: ['ヘルシー'], categories: ['サイド'],
    });
    mockSend.mockResolvedValue({ Items: [makeRecipe(), salad] });

    const result = await recipeService.listByUserId('user-1', { q: 'スパイシー' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('カレーライス');
  });

  it('should filter by tag', async () => {
    const salad = makeRecipe({
      recipeId: 'recipe-2', title: 'サラダ', description: '新鮮な野菜',
      ingredients: [{ name: 'レタス', amount: '1', unit: '個' }], tags: ['ヘルシー'], categories: ['サイド'],
    });
    mockSend.mockResolvedValue({ Items: [makeRecipe(), salad] });

    const result = await recipeService.listByUserId('user-1', { q: 'スパイシー' });
    expect(result.items).toHaveLength(1);
  });

  it('should filter by category', async () => {
    mockSend.mockResolvedValue({
      Items: [
        makeRecipe(),
        makeRecipe({ recipeId: 'recipe-2', title: 'サラダ', categories: ['サイド'] }),
      ],
    });

    const result = await recipeService.listByUserId('user-1', { q: 'メイン' });
    expect(result.items).toHaveLength(1);
  });

  it('should filter by ingredient name', async () => {
    mockSend.mockResolvedValue({
      Items: [
        makeRecipe(),
        makeRecipe({
          recipeId: 'recipe-2',
          title: 'サラダ',
          description: '野菜サラダ',
          ingredients: [{ name: 'レタス', amount: '1', unit: '個' }],
          tags: [],
          categories: [],
        }),
      ],
    });

    const result = await recipeService.listByUserId('user-1', { q: '鶏肉' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('カレーライス');
  });

  it('should filter by ingredient name (case insensitive)', async () => {
    mockSend.mockResolvedValue({
      Items: [makeRecipe({ ingredients: [{ name: 'Chicken', amount: '300', unit: 'g' }] })],
    });

    const result = await recipeService.listByUserId('user-1', { q: 'chicken' });
    expect(result.items).toHaveLength(1);
  });

  it('should clamp limit to max 100', async () => {
    mockSend.mockResolvedValue({ Items: [] });
    await recipeService.listByUserId('user-1', { limit: 200 });

    const command = mockSend.mock.calls[0][0];
    expect(command.input.Limit).toBe(100);
  });

  it('should clamp limit to min 1', async () => {
    mockSend.mockResolvedValue({ Items: [] });
    await recipeService.listByUserId('user-1', { limit: 0 });

    const command = mockSend.mock.calls[0][0];
    expect(command.input.Limit).toBe(1);
  });

  it('should reject invalid nextToken', async () => {
    await expect(
      recipeService.listByUserId('user-1', { nextToken: 'invalid-base64!!!' })
    ).rejects.toThrow('Invalid pagination token');
  });

  it('should reject nextToken with mismatched userId', async () => {
    const token = Buffer.from(JSON.stringify({ userId: 'other-user' })).toString('base64');
    await expect(
      recipeService.listByUserId('user-1', { nextToken: token })
    ).rejects.toThrow('Invalid pagination token');
  });

  it('should filter favorites only', async () => {
    mockSend.mockResolvedValue({
      Items: [
        makeRecipe({ isFavorite: true }),
        makeRecipe({ recipeId: 'recipe-2', title: 'サラダ', isFavorite: false }),
        makeRecipe({ recipeId: 'recipe-3', title: 'パスタ' }),
      ],
    });

    const result = await recipeService.listByUserId('user-1', { favoritesOnly: true });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('カレーライス');
  });

  it('should return all items when favoritesOnly is false', async () => {
    mockSend.mockResolvedValue({
      Items: [
        makeRecipe({ isFavorite: true }),
        makeRecipe({ recipeId: 'recipe-2', title: 'サラダ' }),
      ],
    });

    const result = await recipeService.listByUserId('user-1', { favoritesOnly: false });
    expect(result.items).toHaveLength(2);
  });
});

describe('getById', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('should return recipe when found', async () => {
    const recipe = makeRecipe();
    mockSend.mockResolvedValue({ Item: recipe });

    const result = await recipeService.getById('user-1', 'recipe-1');
    expect(result.title).toBe('カレーライス');
  });

  it('should throw 404 when recipe not found', async () => {
    mockSend.mockResolvedValue({ Item: undefined });

    await expect(recipeService.getById('user-1', 'nonexistent')).rejects.toThrow('Recipe not found');
  });
});

describe('create', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('should create recipe with valid input', async () => {
    mockSend.mockResolvedValue({});

    const result = await recipeService.create('user-1', {
      title: 'テストレシピ',
      description: 'テスト説明',
      ingredients: [{ name: '材料1', amount: '1', unit: '個' }],
      steps: [{ stepNumber: 1, description: 'ステップ1' }],
      categories: [],
      tags: [],
    });

    expect(result.title).toBe('テストレシピ');
    expect(result.userId).toBe('user-1');
    expect(result.recipeId).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });

  it('should throw 400 when title is missing', async () => {
    await expect(
      recipeService.create('user-1', {
        title: '',
        description: 'テスト',
        ingredients: [{ name: '材料', amount: '1', unit: '個' }],
        steps: [{ stepNumber: 1, description: 'ステップ' }],
        categories: [],
        tags: [],
      })
    ).rejects.toThrow();
  });

  it('should throw 400 when ingredients array is empty', async () => {
    await expect(
      recipeService.create('user-1', {
        title: 'テスト',
        description: 'テスト',
        ingredients: [],
        steps: [{ stepNumber: 1, description: 'ステップ' }],
        categories: [],
        tags: [],
      })
    ).rejects.toThrow('At least one ingredient is required');
  });

  it('should throw 400 when steps array is empty', async () => {
    await expect(
      recipeService.create('user-1', {
        title: 'テスト',
        description: 'テスト',
        ingredients: [{ name: '材料', amount: '1', unit: '個' }],
        steps: [],
        categories: [],
        tags: [],
      })
    ).rejects.toThrow('At least one step is required');
  });

  it('should throw 400 when title exceeds max length', async () => {
    await expect(
      recipeService.create('user-1', {
        title: 'a'.repeat(201),
        description: 'テスト',
        ingredients: [{ name: '材料', amount: '1', unit: '個' }],
        steps: [{ stepNumber: 1, description: 'ステップ' }],
        categories: [],
        tags: [],
      })
    ).rejects.toThrow();
  });
});

describe('update', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('should update recipe fields', async () => {
    const existing = makeRecipe();
    // First call: getById, Second call: update
    mockSend
      .mockResolvedValueOnce({ Item: existing })
      .mockResolvedValueOnce({ Attributes: { ...existing, title: '更新済み' } });

    const result = await recipeService.update('user-1', 'recipe-1', { title: '更新済み' });
    expect(result.title).toBe('更新済み');
  });

  it('should throw 404 when recipe does not exist', async () => {
    mockSend.mockResolvedValue({ Item: undefined });

    await expect(
      recipeService.update('user-1', 'nonexistent', { title: '更新' })
    ).rejects.toThrow('Recipe not found');
  });
});

describe('setFavorite', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('should set favorite to true', async () => {
    const recipe = makeRecipe();
    // First call: getById, Second call: update
    mockSend
      .mockResolvedValueOnce({ Item: recipe })
      .mockResolvedValueOnce({ Attributes: { ...recipe, isFavorite: true } });

    const result = await recipeService.setFavorite('user-1', 'recipe-1', true);
    expect(result.isFavorite).toBe(true);
  });

  it('should set favorite to false', async () => {
    const recipe = makeRecipe({ isFavorite: true });
    mockSend
      .mockResolvedValueOnce({ Item: recipe })
      .mockResolvedValueOnce({ Attributes: { ...recipe, isFavorite: false } });

    const result = await recipeService.setFavorite('user-1', 'recipe-1', false);
    expect(result.isFavorite).toBe(false);
  });

  it('should throw 404 when recipe does not exist', async () => {
    mockSend.mockResolvedValue({ Item: undefined });

    await expect(
      recipeService.setFavorite('user-1', 'nonexistent', true)
    ).rejects.toThrow('Recipe not found');
  });
});

describe('deleteRecipe', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('should delete an existing recipe', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: makeRecipe() }) // getById
      .mockResolvedValueOnce({}); // delete

    await expect(recipeService.deleteRecipe('user-1', 'recipe-1')).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('should throw 404 when recipe does not exist', async () => {
    mockSend.mockResolvedValue({ Item: undefined });

    await expect(recipeService.deleteRecipe('user-1', 'nonexistent')).rejects.toThrow('Recipe not found');
  });
});
