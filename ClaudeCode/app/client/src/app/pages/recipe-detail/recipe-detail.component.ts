import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../core/services/recipe.service';
import { AuthService } from '../../core/services/auth.service';
import type { Recipe } from '../../core/models/recipe.model';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">
      @if (loading()) {
        <p>読み込み中...</p>
      } @else if (errorMessage()) {
        <div class="error">{{ errorMessage() }}</div>
        <a routerLink="/recipes">レシピ一覧に戻る</a>
      } @else if (recipe()) {
        <div class="detail">
          <div class="header">
            <h1>{{ recipe()!.title }}</h1>
            @if (canEdit()) {
              <div class="actions">
                <a [routerLink]="['/recipes', recipe()!.recipeId, 'edit']" class="btn-edit">編集</a>
                <button type="button" (click)="deleteRecipe()" class="btn-delete">削除</button>
              </div>
            }
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
            <ul class="ingredients">
              @for (ingredient of recipe()!.ingredients; track $index) {
                <li>
                  {{ ingredient.name }}: {{ ingredient.amount }} {{ ingredient.unit }}
                </li>
              }
            </ul>
          </section>

          <section class="section">
            <h2>作り方</h2>
            <ol class="steps">
              @for (step of recipe()!.steps; track step.stepNumber) {
                <li>{{ step.description }}</li>
              }
            </ol>
          </section>

          <div class="back-link">
            <a routerLink="/recipes">レシピ一覧に戻る</a>
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

      h1 {
        margin: 0;
        color: #2c3e50;
        font-size: 2rem;
        font-weight: 600;
        letter-spacing: -0.5px;
        line-height: 1.3;
      }

      .actions {
        display: flex;
        gap: 0.75rem;
      }

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
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

    this.recipeService.get(id).subscribe({
      next: (recipe) => {
        this.recipe.set(recipe);
        const currentUser = this.authService.currentUser();
        this.canEdit.set(currentUser !== null && currentUser.id === recipe.userId);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('レシピの読み込みに失敗しました');
        console.error('Error loading recipe:', error);
        this.loading.set(false);
      },
    });
  }

  deleteRecipe(): void {
    if (!confirm('本当にこのレシピを削除しますか？')) {
      return;
    }

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
