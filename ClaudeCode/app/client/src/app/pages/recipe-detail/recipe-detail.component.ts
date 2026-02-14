import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../core/services/recipe.service';
import { AuthService } from '../../core/services/auth.service';
import type { Recipe } from '../../core/models/recipe.model';
import { useFakeProgress } from '../../shared/utils/fake-progress';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="loading">
          <p>Now Loading... {{ progress.percent() }}%</p>
          <div class="progress-bar"><div class="progress-bar-inner" [style.width.%]="progress.percent()"></div></div>
        </div>
      } @else if (errorMessage()) {
        <div class="error">{{ errorMessage() }}</div>
        <a routerLink="/recipes">レシピ一覧に戻る</a>
      } @else if (recipe()) {
        <div class="detail">
          <div class="header">
            <div class="title-row">
              <h1>{{ recipe()!.title }}</h1>
              <button type="button" (click)="toggleFavorite()" class="btn-favorite" [class.active]="recipe()!.isFavorite">
                {{ recipe()!.isFavorite ? '\u2665' : '\u2661' }}
              </button>
            </div>
            <div class="actions">
              <a routerLink="/recipes" class="btn-back">レシピ一覧に戻る</a>
              @if (canEdit()) {
                <a [routerLink]="['/recipes', recipe()!.recipeId, 'edit']" class="btn-edit">編集</a>
                <button type="button" (click)="deleteRecipe()" class="btn-delete">削除</button>
              }
            </div>
          </div>

          @if (recipe()!.imageUrl) {
            <img [src]="recipe()!.imageUrl" [alt]="recipe()!.title" class="image" />
          }

          <section class="section">
            <h2>説明</h2>
            <p>{{ recipe()!.description }}</p>
          </section>

          <div class="meta">
            @if (recipe()!.cookingTime) {
              <span>調理時間: {{ recipe()!.cookingTime }}分</span>
            }
            @if (recipe()!.servings) {
              <span>{{ recipe()!.servings }}人分</span>
            }
          </div>

          @if (recipe()!.categories.length > 0) {
            <section class="section">
              <h2>カテゴリ</h2>
              <div class="tags">
                @for (category of recipe()!.categories; track category) {
                  <span class="tag">{{ category }}</span>
                }
              </div>
            </section>
          }

          @if (recipe()!.tags.length > 0) {
            <section class="section">
              <h2>タグ</h2>
              <div class="tags">
                @for (tag of recipe()!.tags; track tag) {
                  <span class="tag">{{ tag }}</span>
                }
              </div>
            </section>
          }

          <section class="section">
            <h2>材料</h2>
            @if (recipe()!.ingredientGroups && recipe()!.ingredientGroups!.length > 0) {
              @for (group of recipe()!.ingredientGroups!; track $index) {
                @if (group.groupLabel) {
                  <h3 class="ingredient-group-label">{{ group.groupLabel }}</h3>
                }
                <ul class="ingredients">
                  @for (ingredient of group.ingredients; track $index) {
                    <li>
                      {{ ingredient.name }}: {{ ingredient.amount }}
                    </li>
                  }
                </ul>
              }
            } @else {
              <ul class="ingredients">
                @for (ingredient of recipe()!.ingredients; track $index) {
                  <li>
                    {{ ingredient.name }}: {{ ingredient.amount }}
                  </li>
                }
              </ul>
            }
          </section>

          <section class="section">
            <h2>作り方</h2>
            <ol class="steps">
              @for (step of recipe()!.steps; track step.stepNumber) {
                <li>
                  {{ step.description }}
                  @if (step.imageUrl) {
                    <img [src]="step.imageUrl" [alt]="'手順' + step.stepNumber" class="step-image" />
                  }
                </li>
              }
            </ol>
          </section>

          @if (recipe()!.comment) {
            <section class="section">
              <h2>コメント</h2>
              <p class="comment">{{ recipe()!.comment }}</p>
            </section>
          }

          <div class="back-link">
            <a routerLink="/recipes">レシピ一覧に戻る</a>
          </div>
        </div>
      }

      @if (showDeleteModal()) {
        <div class="modal-overlay" (click)="cancelDelete()">
          <div class="modal" (click)="$event.stopPropagation()">
            <p class="modal-message">このレシピを削除してよろしいですか？</p>
            <div class="modal-actions">
              <button type="button" (click)="confirmDelete()" class="modal-btn modal-btn-ok">OK</button>
              <button type="button" (click)="cancelDelete()" class="modal-btn modal-btn-cancel">キャンセル</button>
            </div>
          </div>
        </div>
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

      .error {
        background: #e74c3c;
        color: white;
        padding: 1rem;
        border-radius: 4px;
        margin-bottom: 1.5rem;
        font-weight: 500;
      }

      .detail {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        padding: 2.5rem;
        border-left: 4px solid #d4a574;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .title-row {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      h1 {
        margin: 0;
        color: #2c3e50;
        font-size: 2rem;
        font-weight: 600;
        letter-spacing: -0.5px;
        line-height: 1.3;
      }

      .btn-favorite {
        background: none;
        border: none;
        font-size: 1.75rem;
        cursor: pointer;
        color: #e74c3c;
        transition: color 0.2s, transform 0.2s;
        padding: 0.25rem;
        line-height: 1;
        flex-shrink: 0;
      }

      .btn-favorite:hover {
        transform: scale(1.15);
      }

      .btn-favorite.active {
        color: #e74c3c;
      }

      .actions {
        display: flex;
        gap: 0.75rem;
      }

      .btn-back,
      .btn-edit,
      .btn-delete {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
        text-decoration: none;
        font-weight: 500;
        transition: background-color 0.2s;
      }

      .btn-back {
        background: #2c3e50;
        color: white;
        display: inline-block;
      }

      .btn-back:hover {
        background: #1a252f;
      }

      .btn-edit {
        background: #2c3e50;
        color: white;
        display: inline-block;
      }

      .btn-edit:hover {
        background: #1a252f;
      }

      .btn-delete {
        background: #e74c3c;
        color: white;
      }

      .btn-delete:hover {
        background: #c0392b;
      }

      .image {
        width: 100%;
        max-height: 400px;
        object-fit: cover;
        border-radius: 4px;
        margin-bottom: 2rem;
      }

      .section {
        margin-bottom: 2.5rem;
      }

      .section h2 {
        font-size: 1.25rem;
        margin-bottom: 1rem;
        color: #2c3e50;
        font-weight: 600;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #d4a574;
      }

      .meta {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
      }

      .meta span {
        background: #f5f7fa;
        color: #5d6d7e;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .tag {
        background: #f5f7fa;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-size: 0.875rem;
        color: #5d6d7e;
        font-weight: 500;
        border: 1px solid #e5e7eb;
      }

      .ingredient-group-label {
        font-size: 1rem;
        font-weight: 600;
        color: #5d6d7e;
        margin: 1.25rem 0 0.5rem;
        padding-left: 0.5rem;
        border-left: 3px solid #d4a574;
      }

      .ingredient-group-label:first-child {
        margin-top: 0;
      }

      .ingredients {
        list-style: none;
        padding: 0;
      }

      .ingredients li {
        padding: 0.875rem 1rem;
        margin-bottom: 0.5rem;
        background: #f9fafb;
        color: #2c3e50;
        border-left: 3px solid #d4a574;
        font-weight: 500;
      }

      .steps {
        padding-left: 0;
        counter-reset: step-counter;
        list-style: none;
      }

      .steps li {
        padding: 1rem 1rem 1rem 3.5rem;
        line-height: 1.7;
        margin-bottom: 1rem;
        background: #f9fafb;
        border-radius: 4px;
        position: relative;
        color: #2c3e50;
        counter-increment: step-counter;
      }

      .step-image {
        display: block;
        max-width: 100%;
        max-height: 300px;
        object-fit: cover;
        border-radius: 4px;
        margin-top: 0.75rem;
      }

      .steps li::before {
        content: counter(step-counter);
        position: absolute;
        left: 1rem;
        top: 1rem;
        width: 28px;
        height: 28px;
        background: #2c3e50;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.875rem;
      }

      .comment {
        background: #f9fafb;
        padding: 1rem;
        border-radius: 4px;
        line-height: 1.7;
        color: #2c3e50;
        white-space: pre-wrap;
      }

      .back-link {
        margin-top: 2.5rem;
        padding-top: 1.5rem;
        border-top: 2px solid #e5e7eb;
        text-align: center;
      }

      .back-link a {
        display: inline-block;
        padding: 0.625rem 1.5rem;
        background: #2c3e50;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 500;
        transition: background-color 0.2s;
      }

      .back-link a:hover {
        background: #1a252f;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        min-width: 360px;
        max-width: 90vw;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }

      .modal-message {
        font-size: 1rem;
        color: #2c3e50;
        margin: 0 0 1.5rem;
        text-align: center;
      }

      .modal-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
      }

      .modal-btn {
        padding: 0.625rem 1.5rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9375rem;
        font-weight: 500;
        transition: background-color 0.2s;
      }

      .modal-btn-ok {
        background: #e74c3c;
        color: white;
      }

      .modal-btn-ok:hover {
        background: #c0392b;
      }

      .modal-btn-cancel {
        background: #5d6d7e;
        color: white;
      }

      .modal-btn-cancel:hover {
        background: #4a5568;
      }

      @media (max-width: 768px) {
        .page {
          padding: 1rem;
        }

        .detail {
          padding: 1.5rem;
        }

        h1 {
          font-size: 1.5rem;
        }

        .header {
          flex-direction: column;
          gap: 1rem;
        }

        .steps li {
          padding-left: 3rem;
        }

        .steps li::before {
          left: 0.75rem;
        }
      }
    `,
  ],
})
export class RecipeDetailComponent implements OnInit {
  recipe = signal<Recipe | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  canEdit = signal(false);
  progress = useFakeProgress();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('レシピIDが指定されていません');
      return;
    }

    this.loadRecipe(id);
  }

  loadRecipe(id: string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.progress.start();

    this.recipeService.get(id).subscribe({
      next: (recipe) => {
        this.progress.complete();
        this.recipe.set(recipe);
        const currentUser = this.authService.currentUser();
        this.canEdit.set(currentUser !== null && currentUser.id === recipe.userId);
        this.loading.set(false);
      },
      error: (error) => {
        this.progress.reset();
        this.errorMessage.set('レシピの読み込みに失敗しました');
        console.error('Error loading recipe:', error);
        this.loading.set(false);
      },
    });
  }

  toggleFavorite(): void {
    const current = this.recipe();
    if (!current) return;

    const newValue = !current.isFavorite;
    this.recipeService.setFavorite(current.recipeId, newValue).subscribe({
      next: (updated) => {
        this.recipe.set(updated);
      },
      error: (error) => {
        console.error('Error toggling favorite:', error);
      },
    });
  }

  readonly showDeleteModal = signal(false);

  deleteRecipe(): void {
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
  }

  confirmDelete(): void {
    this.showDeleteModal.set(false);

    const recipe = this.recipe();
    if (!recipe) return;

    this.recipeService.delete(recipe.recipeId).subscribe({
      next: () => {
        this.router.navigate(['/recipes']);
      },
      error: (error) => {
        this.errorMessage.set('レシピの削除に失敗しました');
        console.error('Error deleting recipe:', error);
      },
    });
  }
}
