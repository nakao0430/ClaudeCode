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
  cookingTime?: number;
  servings?: number;
  imageUrl?: string;
  isFavorite?: boolean;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeListResponse {
  items: Recipe[];
  nextToken?: string;
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
