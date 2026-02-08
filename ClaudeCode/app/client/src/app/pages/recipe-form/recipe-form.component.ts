import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecipeService } from '../../core/services/recipe.service';
import type { Recipe, CreateRecipeRequest, UpdateRecipeRequest, Ingredient, Step } from '../../core/models/recipe.model';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [FormsModule, RouterLink, ImageUploadComponent],
  template: `
    <div class="page">
      <h1>{{ isEditMode() ? 'レシピ編集' : 'レシピ作成' }}</h1>

      @if (errorMessage()) {
        <div class="error">{{ errorMessage() }}</div>
      }

      @if (loading()) {
        <p>読み込み中...</p>
      } @else {
        <form (ngSubmit)="submit()" #form="ngForm" class="form">
          <div class="form-group">
            <label for="title">タイトル *</label>
            <input
              type="text"
              id="title"
              name="title"
              [(ngModel)]="formData.title"
              required
              placeholder="例: チキンカレー"
            />
          </div>

          <div class="form-group">
            <label for="description">説明 *</label>
            <textarea
              id="description"
              name="description"
              [(ngModel)]="formData.description"
              required
              rows="4"
              placeholder="レシピの説明を入力してください"
            ></textarea>
          </div>

          <div class="form-group">
            <label>画像</label>
            <app-image-upload (imageUploaded)="onImageUploaded($event)"></app-image-upload>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="cookingTime">調理時間（分）</label>
              <input
                type="number"
                id="cookingTime"
                name="cookingTime"
                [(ngModel)]="formData.cookingTime"
                min="1"
                placeholder="30"
              />
            </div>

            <div class="form-group">
              <label for="servings">人数</label>
              <input
                type="number"
                id="servings"
                name="servings"
                [(ngModel)]="formData.servings"
                min="1"
                placeholder="2"
              />
            </div>
          </div>

          <div class="form-group">
            <label>材料 *</label>
            <div class="ingredients-list">
              @for (ingredient of formData.ingredients; track $index; let i = $index) {
                <div class="ingredient-item">
                  <input
                    type="text"
                    [(ngModel)]="ingredient.name"
                    name="ingredient-name-{{i}}"
                    placeholder="材料名"
                    required
                  />
                  <input
                    type="text"
                    [(ngModel)]="ingredient.amount"
                    name="ingredient-amount-{{i}}"
                    placeholder="分量"
                    required
                  />
                  <input
                    type="text"
                    [(ngModel)]="ingredient.unit"
                    name="ingredient-unit-{{i}}"
                    placeholder="単位"
                    required
                  />
                  <button
                    type="button"
                    (click)="removeIngredient(i)"
                    class="btn-remove"
                    [disabled]="formData.ingredients.length === 1"
                  >
                    削除
                  </button>
                </div>
              }
            </div>
            <button type="button" (click)="addIngredient()" class="btn-add">
              材料を追加
            </button>
          </div>

          <div class="form-group">
            <label>作り方 *</label>
            <div class="steps-list">
              @for (step of formData.steps; track $index; let i = $index) {
                <div class="step-item">
                  <span class="step-number">{{ i + 1 }}.</span>
                  <textarea
                    [(ngModel)]="step.description"
                    name="step-{{i}}"
                    placeholder="手順を入力してください"
                    required
                    rows="2"
                  ></textarea>
                  <button
                    type="button"
                    (click)="removeStep(i)"
                    class="btn-remove"
                    [disabled]="formData.steps.length === 1"
                  >
                    削除
                  </button>
                </div>
              }
            </div>
            <button type="button" (click)="addStep()" class="btn-add">
              手順を追加
            </button>
          </div>

          <div class="form-group">
            <label for="categories">カテゴリ（カンマ区切り）</label>
            <input
              type="text"
              id="categories"
              name="categories"
              [(ngModel)]="categoriesText"
              placeholder="和食, メイン"
            />
          </div>

          <div class="form-group">
            <label for="tags">タグ（カンマ区切り）</label>
            <input
              type="text"
              id="tags"
              name="tags"
              [(ngModel)]="tagsText"
              placeholder="簡単, 時短"
            />
          </div>

          <div class="form-actions">
            <button
              type="submit"
              class="btn-submit"
              [disabled]="!form.valid || submitting()"
            >
              {{ submitting() ? '保存中...' : '保存' }}
            </button>
            <a routerLink="/recipes" class="btn-cancel">キャンセル</a>
          </div>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
        background: #f5f7fa;
        min-height: 100vh;
      }

      h1 {
        margin-bottom: 2rem;
        color: #2c3e50;
        font-size: 2rem;
        font-weight: 600;
        text-align: center;
        letter-spacing: -0.5px;
      }

      .error {
        background: #e74c3c;
        color: white;
        padding: 1rem;
        border-radius: 4px;
        margin-bottom: 1.5rem;
        font-weight: 500;
      }

      .form {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        padding: 2.5rem;
        border-left: 4px solid #d4a574;
      }

      .form-group {
        margin-bottom: 1.75rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.25rem;
      }

      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #2c3e50;
        font-size: 0.9375rem;
      }

      input[type="text"],
      input[type="number"],
      textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.9375rem;
        font-family: inherit;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      input:focus,
      textarea:focus {
        outline: none;
        border-color: #2c3e50;
        box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
      }

      .ingredients-list,
      .steps-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .ingredient-item {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr auto;
        gap: 0.75rem;
        align-items: center;
        padding: 0.75rem;
        background: #f9fafb;
        border-radius: 4px;
        border-left: 3px solid #d4a574;
      }

      .step-item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.75rem;
        align-items: start;
        padding: 0.875rem;
        background: #f9fafb;
        border-radius: 4px;
        border-left: 3px solid #2c3e50;
      }

      .step-number {
        padding-top: 0.5rem;
        font-weight: 600;
        color: #2c3e50;
        font-size: 1rem;
      }

      .btn-add,
      .btn-remove {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: background-color 0.2s;
      }

      .btn-add {
        background: #2c3e50;
        color: white;
        align-self: flex-start;
      }

      .btn-add:hover {
        background: #1a252f;
      }

      .btn-remove {
        background: #e74c3c;
        color: white;
      }

      .btn-remove:hover:not(:disabled) {
        background: #c0392b;
      }

      .btn-remove:disabled {
        background: #95a5a6;
        cursor: not-allowed;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 2px solid #e5e7eb;
      }

      .btn-submit,
      .btn-cancel {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        text-decoration: none;
        display: inline-block;
        transition: background-color 0.2s;
      }

      .btn-submit {
        background: #2c3e50;
        color: white;
      }

      .btn-submit:hover:not(:disabled) {
        background: #1a252f;
      }

      .btn-submit:disabled {
        background: #95a5a6;
        cursor: not-allowed;
      }

      .btn-cancel {
        background: #5d6d7e;
        color: white;
      }

      .btn-cancel:hover {
        background: #4a5568;
      }

      @media (max-width: 768px) {
        .page {
          padding: 1rem;
        }

        .form {
          padding: 1.5rem;
        }

        h1 {
          font-size: 1.8rem;
        }

        .form-row {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .ingredient-item {
          grid-template-columns: 1fr;
        }

        .step-item {
          grid-template-columns: 1fr;
        }

        .step-number {
          padding-top: 0;
        }
      }
    `,
  ],
})
export class RecipeFormComponent implements OnInit {
  isEditMode = signal(false);
  loading = signal(false);
  submitting = signal(false);
  errorMessage = signal('');
  recipeId: string | null = null;

  formData: {
    title: string;
    description: string;
    ingredients: Ingredient[];
    steps: Step[];
    cookingTime?: number;
    servings?: number;
    imageUrl?: string;
  } = {
    title: '',
    description: '',
    ingredients: [{ name: '', amount: '', unit: '' }],
    steps: [{ stepNumber: 1, description: '' }],
  };

  categoriesText = '';
  tagsText = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.recipeId = id;
      this.loadRecipe(id);
    }
  }

  loadRecipe(id: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.recipeService.get(id).subscribe({
      next: (recipe) => {
        this.formData = {
          title: recipe.title,
          description: recipe.description,
          ingredients: [...recipe.ingredients],
          steps: [...recipe.steps],
          cookingTime: recipe.cookingTime,
          servings: recipe.servings,
          imageUrl: recipe.imageUrl,
        };
        this.categoriesText = recipe.categories.join(', ');
        this.tagsText = recipe.tags.join(', ');
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('レシピの読み込みに失敗しました');
        console.error('Error loading recipe:', error);
        this.loading.set(false);
      },
    });
  }

  addIngredient(): void {
    this.formData.ingredients.push({ name: '', amount: '', unit: '' });
  }

  removeIngredient(index: number): void {
    if (this.formData.ingredients.length > 1) {
      this.formData.ingredients.splice(index, 1);
    }
  }

  addStep(): void {
    const nextNumber = this.formData.steps.length + 1;
    this.formData.steps.push({ stepNumber: nextNumber, description: '' });
  }

  removeStep(index: number): void {
    if (this.formData.steps.length > 1) {
      this.formData.steps.splice(index, 1);
      // Renumber steps
      this.formData.steps.forEach((step, i) => {
        step.stepNumber = i + 1;
      });
    }
  }

  onImageUploaded(imageUrl: string): void {
    this.formData.imageUrl = imageUrl || undefined;
  }

  submit(): void {
    this.submitting.set(true);
    this.errorMessage.set('');

    const categories = this.categoriesText
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const tags = this.tagsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (this.isEditMode() && this.recipeId) {
      const updateRequest: UpdateRecipeRequest = {
        title: this.formData.title,
        description: this.formData.description,
        ingredients: this.formData.ingredients,
        steps: this.formData.steps,
        categories,
        tags,
        cookingTime: this.formData.cookingTime,
        servings: this.formData.servings,
        imageUrl: this.formData.imageUrl,
      };

      this.recipeService.update(this.recipeId, updateRequest).subscribe({
        next: () => {
          this.router.navigate(['/recipes', this.recipeId]);
        },
        error: (error) => {
          this.errorMessage.set('レシピの更新に失敗しました');
          console.error('Error updating recipe:', error);
          this.submitting.set(false);
        },
      });
    } else {
      const createRequest: CreateRecipeRequest = {
        title: this.formData.title,
        description: this.formData.description,
        ingredients: this.formData.ingredients,
        steps: this.formData.steps,
        categories,
        tags,
        cookingTime: this.formData.cookingTime,
        servings: this.formData.servings,
        imageUrl: this.formData.imageUrl,
      };

      this.recipeService.create(createRequest).subscribe({
        next: (recipe) => {
          this.router.navigate(['/recipes', recipe.recipeId]);
        },
        error: (error) => {
          this.errorMessage.set('レシピの作成に失敗しました');
          console.error('Error creating recipe:', error);
          this.submitting.set(false);
        },
      });
    }
  }
}
