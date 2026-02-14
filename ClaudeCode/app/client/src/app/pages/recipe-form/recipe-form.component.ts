import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecipeService } from '../../core/services/recipe.service';
import type { Recipe, CreateRecipeRequest, UpdateRecipeRequest, Ingredient, Step, IngredientGroup } from '../../core/models/recipe.model';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { useFakeProgress } from '../../shared/utils/fake-progress';

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

      @if (!isEditMode()) {
        <div class="scrape-section">
          <label>URLからレシピを読み取り</label>
          <div class="scrape-input-row">
            <input
              type="url"
              [(ngModel)]="scrapeUrl"
              name="scrapeUrl"
              placeholder="レシピページのURLを貼り付けてください"
              [disabled]="scraping()"
              class="scrape-url-input"
            />
            <button
              type="button"
              (click)="scrapeFromUrl()"
              [disabled]="!scrapeUrl || scraping()"
              class="btn-scrape"
            >
              {{ scraping() ? '読み取り中...' : '読み取り' }}
            </button>
          </div>
          @if (scraping()) {
            <div class="scrape-loading">
              <p class="scrape-progress-text">読み取り中... {{ scrapeProgress.percent() }}%</p>
              <div class="progress-bar"><div class="progress-bar-inner" [style.width.%]="scrapeProgress.percent()"></div></div>
            </div>
          }
          @if (scrapeError()) {
            <p class="scrape-error">{{ scrapeError() }}</p>
          }
          @if (scrapeSuccess()) {
            <p class="scrape-success">レシピを読み取りました。内容を確認して保存してください。</p>
          }
        </div>
      }

      @if (loading()) {
        <div class="loading">
          <p>Now Loading... {{ loadProgress.percent() }}%</p>
          <div class="progress-bar"><div class="progress-bar-inner" [style.width.%]="loadProgress.percent()"></div></div>
        </div>
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
            <div class="ingredient-groups">
              @for (group of formData.ingredientGroups; track $index; let gi = $index) {
                <div class="ingredient-group">
                  <div class="group-header">
                    <input
                      type="text"
                      [(ngModel)]="group.groupLabel"
                      name="group-label-{{gi}}"
                      placeholder="グループ名（例: ソース）"
                      class="group-label-input"
                    />
                    @if (formData.ingredientGroups.length > 1) {
                      <button
                        type="button"
                        (click)="removeGroup(gi)"
                        class="btn-remove-group"
                      >
                        グループ削除
                      </button>
                    }
                  </div>
                  <div class="ingredients-list">
                    @for (ingredient of group.ingredients; track $index; let ii = $index) {
                      <div class="ingredient-item">
                        <input
                          type="text"
                          [(ngModel)]="ingredient.name"
                          name="ingredient-name-{{gi}}-{{ii}}"
                          placeholder="材料名"
                          required
                        />
                        <input
                          type="text"
                          [(ngModel)]="ingredient.amount"
                          name="ingredient-amount-{{gi}}-{{ii}}"
                          placeholder="分量"
                          required
                        />
                        <button
                          type="button"
                          (click)="removeIngredient(gi, ii)"
                          class="btn-remove"
                          [disabled]="group.ingredients.length === 1 && formData.ingredientGroups.length === 1"
                        >
                          削除
                        </button>
                      </div>
                    }
                  </div>
                  <button type="button" (click)="addIngredient(gi)" class="btn-add">
                    材料を追加
                  </button>
                </div>
              }
            </div>
            <button type="button" (click)="addGroup()" class="btn-add btn-add-group">
              材料グループを追加
            </button>
          </div>

          <div class="form-group">
            <label>作り方 *</label>
            <div class="steps-list">
              @for (step of formData.steps; track $index; let i = $index) {
                <div class="step-item">
                  <div class="step-header">
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
                  <div class="step-image">
                    <app-image-upload (imageUploaded)="onStepImageUploaded(i, $event)"></app-image-upload>
                  </div>
                </div>
              }
            </div>
            <button type="button" (click)="addStep()" class="btn-add">
              手順を追加
            </button>
          </div>

          <div class="form-group">
            <label for="comment">コメント</label>
            <textarea
              id="comment"
              name="comment"
              [(ngModel)]="formData.comment"
              rows="3"
              placeholder="コメントを入力してください"
            ></textarea>
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

      .loading {
        text-align: center;
        padding: 3rem;
        color: #5d6d7e;
        font-size: 1.125rem;
      }

      .loading p {
        margin: 0 0 1rem;
      }

      .progress-bar {
        width: 240px;
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        margin: 0 auto;
        overflow: hidden;
      }

      .progress-bar-inner {
        height: 100%;
        background: #d4a574;
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      .scrape-progress-text {
        font-size: 0.875rem;
        color: #5d6d7e;
        margin: 0 0 0.5rem;
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
        box-sizing: border-box;
        min-width: 0;
      }

      input:focus,
      textarea:focus {
        outline: none;
        border-color: #2c3e50;
        box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
      }

      .ingredient-groups {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        margin-bottom: 1rem;
      }

      .ingredient-group {
        background: #f9fafb;
        border-radius: 6px;
        padding: 1rem;
        border-left: 3px solid #d4a574;
      }

      .group-header {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        margin-bottom: 0.75rem;
      }

      .group-label-input {
        flex: 1;
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.875rem;
        font-family: inherit;
        background: white;
        font-weight: 500;
        box-sizing: border-box;
      }

      .group-label-input:focus {
        outline: none;
        border-color: #d4a574;
        box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.15);
      }

      .btn-remove-group {
        padding: 0.375rem 0.75rem;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 500;
        white-space: nowrap;
        transition: background-color 0.2s;
      }

      .btn-remove-group:hover {
        background: #c0392b;
      }

      .btn-add-group {
        margin-top: 0.5rem;
        background: #d4a574;
      }

      .btn-add-group:hover {
        background: #c4956a;
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
        grid-template-columns: 2fr 1fr auto;
        gap: 0.75rem;
        align-items: center;
        padding: 0.75rem;
        background: white;
        border-radius: 4px;
        border-left: 3px solid #e5e7eb;
      }

      .step-item {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 0.875rem;
        background: #f9fafb;
        border-radius: 4px;
        border-left: 3px solid #2c3e50;
      }

      .step-header {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.75rem;
        align-items: start;
      }

      .step-image {
        padding-left: 2rem;
      }

      .step-number {
        padding-top: 0.5rem;
        font-weight: 600;
        color: #2c3e50;
        font-size: 1rem;
      }

      .btn-add,
      .btn-remove {
        padding: 0.5rem 1.25rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: background-color 0.2s;
        white-space: nowrap;
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

      .scrape-section {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        border-left: 4px solid #d4a574;
      }

      .scrape-section label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #2c3e50;
        font-size: 0.9375rem;
      }

      .scrape-input-row {
        display: flex;
        gap: 0.75rem;
      }

      .scrape-url-input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.9375rem;
        font-family: inherit;
        box-sizing: border-box;
        min-width: 0;
      }

      .scrape-url-input:focus {
        outline: none;
        border-color: #2c3e50;
        box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
      }

      .btn-scrape {
        padding: 0.75rem 1.5rem;
        background: #d4a574;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9375rem;
        font-weight: 500;
        white-space: nowrap;
        transition: background-color 0.2s;
      }

      .btn-scrape:hover:not(:disabled) {
        background: #c4956a;
      }

      .btn-scrape:disabled {
        background: #95a5a6;
        cursor: not-allowed;
      }

      .scrape-loading {
        margin-top: 0.75rem;
      }

      .scrape-error {
        color: #e74c3c;
        font-size: 0.875rem;
        margin: 0.5rem 0 0;
      }

      .scrape-success {
        color: #27ae60;
        font-size: 0.875rem;
        margin: 0.5rem 0 0;
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

        .step-header {
          grid-template-columns: 1fr;
        }

        .step-image {
          padding-left: 0;
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
  scraping = signal(false);
  scrapeError = signal('');
  scrapeSuccess = signal(false);
  errorMessage = signal('');
  recipeId: string | null = null;
  scrapeUrl = '';
  loadProgress = useFakeProgress();
  scrapeProgress = useFakeProgress();

  formData: {
    title: string;
    description: string;
    ingredientGroups: IngredientGroup[];
    steps: Step[];
    cookingTime?: number;
    servings?: number;
    imageUrl?: string;
    comment?: string;
  } = {
    title: '',
    description: '',
    ingredientGroups: [{ groupLabel: '', ingredients: [{ name: '', amount: '', unit: '' }] }],
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
    this.loadProgress.start();

    this.recipeService.get(id).subscribe({
      next: (recipe) => {
        this.loadProgress.complete();
        const groups = recipe.ingredientGroups && recipe.ingredientGroups.length > 0
          ? recipe.ingredientGroups.map(g => ({ groupLabel: g.groupLabel, ingredients: [...g.ingredients] }))
          : [{ groupLabel: '', ingredients: [...recipe.ingredients] }];
        this.formData = {
          title: recipe.title,
          description: recipe.description,
          ingredientGroups: groups,
          steps: [...recipe.steps],
          cookingTime: recipe.cookingTime,
          servings: recipe.servings,
          imageUrl: recipe.imageUrl,
          comment: recipe.comment,
        };
        this.categoriesText = recipe.categories.join(', ');
        this.tagsText = recipe.tags.join(', ');
        this.loading.set(false);
      },
      error: (error) => {
        this.loadProgress.reset();
        this.errorMessage.set('レシピの読み込みに失敗しました');
        console.error('Error loading recipe:', error);
        this.loading.set(false);
      },
    });
  }

  addIngredient(groupIndex: number): void {
    this.formData.ingredientGroups[groupIndex].ingredients.push({ name: '', amount: '', unit: '' });
  }

  removeIngredient(groupIndex: number, ingredientIndex: number): void {
    const group = this.formData.ingredientGroups[groupIndex];
    if (group.ingredients.length > 1 || this.formData.ingredientGroups.length > 1) {
      group.ingredients.splice(ingredientIndex, 1);
      if (group.ingredients.length === 0) {
        this.formData.ingredientGroups.splice(groupIndex, 1);
      }
    }
  }

  addGroup(): void {
    this.formData.ingredientGroups.push({ groupLabel: '', ingredients: [{ name: '', amount: '', unit: '' }] });
  }

  removeGroup(groupIndex: number): void {
    if (this.formData.ingredientGroups.length > 1) {
      this.formData.ingredientGroups.splice(groupIndex, 1);
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

  onStepImageUploaded(index: number, imageUrl: string): void {
    this.formData.steps[index].imageUrl = imageUrl || undefined;
  }

  onImageUploaded(imageUrl: string): void {
    this.formData.imageUrl = imageUrl || undefined;
  }

  scrapeFromUrl(): void {
    if (!this.scrapeUrl) return;

    this.scraping.set(true);
    this.scrapeError.set('');
    this.scrapeSuccess.set(false);
    this.scrapeProgress.start();

    this.recipeService.scrapeFromUrl(this.scrapeUrl).subscribe({
      next: (result) => {
        this.formData.title = result.title || '';
        this.formData.description = result.description || '';
        if (result.ingredientGroups && result.ingredientGroups.length > 0) {
          this.formData.ingredientGroups = result.ingredientGroups;
        } else if (result.ingredients?.length) {
          this.formData.ingredientGroups = [{ groupLabel: '', ingredients: result.ingredients }];
        } else {
          this.formData.ingredientGroups = [{ groupLabel: '', ingredients: [{ name: '', amount: '', unit: '' }] }];
        }
        this.formData.steps = result.steps?.length
          ? result.steps
          : [{ stepNumber: 1, description: '' }];
        if (result.cookingTime) {
          this.formData.cookingTime = result.cookingTime;
        }
        if (result.servings) {
          this.formData.servings = result.servings;
        }
        this.scrapeProgress.complete();
        this.scraping.set(false);
        this.scrapeSuccess.set(true);
      },
      error: (error) => {
        this.scrapeProgress.reset();
        this.scrapeError.set('レシピの読み取りに失敗しました。URLを確認してください。');
        console.error('Error scraping recipe:', error);
        this.scraping.set(false);
      },
    });
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

    const flatIngredients = this.formData.ingredientGroups.flatMap(g => g.ingredients);

    if (this.isEditMode() && this.recipeId) {
      const updateRequest: UpdateRecipeRequest = {
        title: this.formData.title,
        description: this.formData.description,
        ingredients: flatIngredients,
        ingredientGroups: this.formData.ingredientGroups,
        steps: this.formData.steps,
        categories,
        tags,
        cookingTime: this.formData.cookingTime,
        servings: this.formData.servings,
        imageUrl: this.formData.imageUrl,
        comment: this.formData.comment,
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
        ingredients: flatIngredients,
        ingredientGroups: this.formData.ingredientGroups,
        steps: this.formData.steps,
        categories,
        tags,
        cookingTime: this.formData.cookingTime,
        servings: this.formData.servings,
        imageUrl: this.formData.imageUrl,
        comment: this.formData.comment,
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
