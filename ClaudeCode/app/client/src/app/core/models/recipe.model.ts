export interface Recipe {
  userId: string;
  recipeId: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  ingredientGroups?: IngredientGroup[];
  steps: Step[];
  categories: string[];
  tags: string[];
  cookingTime?: number; // 分
  servings?: number; // 人数
  imageUrl?: string;
  isFavorite?: boolean;
  comment?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface IngredientGroup {
  groupLabel: string;
  ingredients: Ingredient[];
}

export interface Step {
  stepNumber: number;
  description: string;
  imageUrl?: string;
}

export interface RecipeListResponse {
  items: Recipe[];
  nextToken?: string;
}

export interface RecipeListParams {
  q?: string;
  limit?: number;
  nextToken?: string;
  favoritesOnly?: boolean;
}

export interface CreateRecipeRequest {
  title: string;
  description: string;
  ingredients: Ingredient[];
  ingredientGroups?: IngredientGroup[];
  steps: Step[];
  categories: string[];
  tags: string[];
  cookingTime?: number;
  servings?: number;
  imageUrl?: string;
  comment?: string;
}

export interface UpdateRecipeRequest {
  title?: string;
  description?: string;
  ingredients?: Ingredient[];
  ingredientGroups?: IngredientGroup[];
  steps?: Step[];
  categories?: string[];
  tags?: string[];
  cookingTime?: number;
  servings?: number;
  imageUrl?: string;
  comment?: string;
}

export interface ScrapeRequest {
  url: string;
}

export interface ScrapeResponse {
  title: string;
  description: string;
  ingredients: Ingredient[];
  ingredientGroups?: IngredientGroup[];
  steps: Step[];
  cookingTime?: number;
  servings?: number;
}
