export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface Step {
  stepNumber: number;
  description: string;
}

export interface Recipe {
  userId: string;
  recipeId: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  steps: Step[];
  categories: string[];
  tags: string[];
  cookingTime?: number;
  servings?: number;
  imageUrl?: string;
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
  steps: Step[];
  categories: string[];
  tags: string[];
  cookingTime?: number;
  servings?: number;
  imageUrl?: string;
}

export interface UpdateRecipeRequest {
  title?: string;
  description?: string;
  ingredients?: Ingredient[];
  steps?: Step[];
  categories?: string[];
  tags?: string[];
  cookingTime?: number;
  servings?: number;
  imageUrl?: string;
}
