import { Component, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RecipeService } from '../../core/services/recipe.service';
import type { Recipe, RecipeListResponse } from '../../core/models/recipe.model';
import { AuthService } from '../../core/services/auth.service';
import { useFakeProgress } from '../../shared/utils/fake-progress';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="page">
      <div class="header">
        <h1>レシピ一覧</h1>
        <nav class="top">
          <a routerLink="/">トップ</a>
          <button type="button" (click)="logout()" class="btn-logout">ログアウト</button>
        </nav>
      </div>
      @if (!auth.isLoggedIn()) {
        <p>ログインするとレシピを表示できます。<a routerLink="/login">ログイン</a></p>
      } @else {
        <div class="toolbar">
          <div class="search-box">
            <input type="text" placeholder="レシピを検索..." [(ngModel)]="searchQ" (keyup.enter)="load()" />
            <button type="button" (click)="load()" class="btn-search">検索</button>
          </div>
          <select class="sort-select" [ngModel]="sortKey()" (ngModelChange)="sortKey.set($event)">
            <option value="createdAt-desc">新しい順</option>
            <option value="createdAt-asc">古い順</option>
            <option value="title-asc">名前 A→Z</option>
            <option value="title-desc">名前 Z→A</option>
          </select>
          <button type="button" (click)="toggleFavoritesFilter()" class="btn-favorites" [class.active]="favoritesOnly()">
            {{ favoritesOnly() ? '\u2665' : '\u2661' }} お気に入り
          </button>
          <a routerLink="/recipes/new" class="btn-new">新しいレシピを作成</a>
        </div>
        @if (loading()) {
          <div class="loading">
            <p>Now Loading... {{ progress.percent() }}%</p>
            <div class="progress-bar"><div class="progress-bar-inner" [style.width.%]="progress.percent()"></div></div>
          </div>
        } @else if (items().length === 0) {
          <div class="empty">
            <p>レシピがありません。</p>
            <a routerLink="/recipes/new" class="btn-new">最初のレシピを登録</a>
          </div>
        } @else {
          <div class="content-layout">
            <div class="main-content">
              <div class="grid">
                @for (r of filteredItems(); track r.recipeId) {
                  <a [routerLink]="['/recipes', r.recipeId]" class="card">
                    <div class="card-image">
                      @if (r.imageUrl) {
                        <img [src]="r.imageUrl" [alt]="r.title" />
                      } @else {
                        <div class="no-image">📷</div>
                      }
                    </div>
                    <div class="card-content">
                      <h3 class="card-title">{{ r.title }}</h3>
                      @if (r.description) {
                        <p class="card-description">{{ r.description }}</p>
                      }
                      <div class="card-meta">
                        @if (r.cookingTime) {
                          <span class="meta-item">⏱️ {{ r.cookingTime }}分</span>
                        }
                        @if (r.servings) {
                          <span class="meta-item">👥 {{ r.servings }}人分</span>
                        }
                      </div>
                      <div class="card-footer">
                        <span class="date">{{ r.createdAt | date:'short' }}</span>
                        <button type="button" (click)="toggleFavorite($event, r)" class="card-favorite" [class.active]="r.isFavorite">
                          {{ r.isFavorite ? '\u2665' : '\u2661' }}
                        </button>
                      </div>
                    </div>
                  </a>
                }
              </div>
              @if (filteredItems().length === 0 && selectedCategory()) {
                <div class="empty">
                  <p>「{{ selectedCategory() }}」のレシピはありません。</p>
                </div>
              }
              @if (nextToken()) {
                <div class="load-more">
                  <button type="button" (click)="loadMore()" class="btn-load-more">もっと見る</button>
                </div>
              }
            </div>
            <aside class="sidebar">
              <h2 class="sidebar-title">カテゴリ</h2>
              <ul class="category-list">
                <li>
                  <button type="button" (click)="selectCategory(null)"
                    class="category-item" [class.active]="!selectedCategory()">
                    すべて
                    <span class="category-count">{{ items().length }}</span>
                  </button>
                </li>
                @for (cat of categories(); track cat.name) {
                  <li>
                    <button type="button" (click)="selectCategory(cat.name)"
                      class="category-item" [class.active]="selectedCategory() === cat.name">
                      {{ cat.name }}
                      <span class="category-count">{{ cat.count }}</span>
                    </button>
                  </li>
                }
              </ul>
            </aside>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .page {
        padding: 2rem;
        max-width: 1400px;
        margin: 0 auto;
        background: #f5f7fa;
        min-height: 100vh;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        background: white;
        padding: 1.5rem 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border-left: 4px solid #2c3e50;
      }

      h1 {
        margin: 0;
        color: #2c3e50;
        font-size: 1.75rem;
        font-weight: 600;
        letter-spacing: -0.5px;
      }

      .top {
        display: flex;
        gap: 1.5rem;
        align-items: center;
      }

      .top a {
        color: #5d6d7e;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s;
      }

      .top a:hover {
        color: #2c3e50;
      }

      .btn-logout {
        padding: 0.5rem 1rem;
        background: #5d6d7e;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: background-color 0.2s;
      }

      .btn-logout:hover {
        background: #4a5568;
      }

      .toolbar {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        align-items: center;
        background: white;
        padding: 1.25rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      .search-box {
        display: flex;
        gap: 0.75rem;
        flex: 1;
        min-width: 250px;
      }

      .search-box input {
        flex: 1;
        padding: 0.625rem 0.875rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.9375rem;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .search-box input:focus {
        outline: none;
        border-color: #2c3e50;
        box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
      }

      .sort-select {
        padding: 0.625rem 0.875rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.9375rem;
        color: #5d6d7e;
        background: white;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .sort-select:focus {
        outline: none;
        border-color: #2c3e50;
      }

      .btn-favorites {
        padding: 0.625rem 1.25rem;
        background: white;
        color: #5d6d7e;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9375rem;
        font-weight: 500;
        transition: all 0.2s;
      }

      .btn-favorites:hover {
        border-color: #e74c3c;
        color: #e74c3c;
      }

      .btn-favorites.active {
        background: #e74c3c;
        color: white;
        border-color: #e74c3c;
      }

      .btn-search,
      .btn-new {
        padding: 0.625rem 1.25rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9375rem;
        font-weight: 500;
        text-decoration: none;
        display: inline-block;
        transition: background-color 0.2s;
      }

      .btn-search {
        background: #2c3e50;
        color: white;
      }

      .btn-search:hover {
        background: #1a252f;
      }

      .btn-new {
        background: #d4a574;
        color: white;
      }

      .btn-new:hover {
        background: #c4945f;
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

      .empty {
        text-align: center;
        padding: 3rem 2rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      .empty p {
        color: #5d6d7e;
        margin-bottom: 0;
        font-size: 1rem;
      }

      .content-layout {
        display: flex;
        gap: 1.5rem;
        align-items: flex-start;
      }

      .main-content {
        flex: 1;
        min-width: 0;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .sidebar {
        width: 240px;
        flex-shrink: 0;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        padding: 1.25rem;
        position: sticky;
        top: 2rem;
      }

      .sidebar-title {
        margin: 0 0 1rem;
        font-size: 1rem;
        font-weight: 600;
        color: #2c3e50;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid #2c3e50;
      }

      .category-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .category-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 0.5rem 0.75rem;
        background: none;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
        color: #5d6d7e;
        text-align: left;
        transition: all 0.2s;
      }

      .category-item:hover {
        background: #f5f7fa;
        color: #2c3e50;
      }

      .category-item.active {
        background: #2c3e50;
        color: white;
      }

      .category-item.active .category-count {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      .category-count {
        font-size: 0.75rem;
        background: #f0f0f0;
        color: #9ca3af;
        padding: 0.125rem 0.5rem;
        border-radius: 10px;
        font-weight: 500;
      }

      .card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        overflow: hidden;
        transition: box-shadow 0.3s, transform 0.2s;
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        border-left: 3px solid #d4a574;
      }

      .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
      }

      .card-image {
        width: 100%;
        height: 200px;
        overflow: hidden;
        background: #e8e8e8;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .card-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s;
      }

      .card:hover .card-image img {
        transform: scale(1.05);
      }

      .no-image {
        font-size: 3rem;
        opacity: 0.4;
      }

      .card-content {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        flex: 1;
      }

      .card-title {
        margin: 0;
        font-size: 1.125rem;
        color: #2c3e50;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.4;
      }

      .card-description {
        margin: 0;
        font-size: 0.875rem;
        color: #5d6d7e;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.6;
      }

      .card-meta {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .meta-item {
        font-size: 0.8125rem;
        color: #5d6d7e;
        background: #f5f7fa;
        padding: 0.375rem 0.75rem;
        border-radius: 4px;
        font-weight: 500;
      }

      .card-footer {
        margin-top: auto;
        padding-top: 0.75rem;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .date {
        font-size: 0.8125rem;
        color: #9ca3af;
      }

      .card-favorite {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        color: #e74c3c;
        transition: color 0.2s, transform 0.2s;
        padding: 0.25rem;
        line-height: 1;
      }

      .card-favorite:hover {
        transform: scale(1.2);
      }

      .card-favorite.active {
        color: #e74c3c;
      }

      .load-more {
        text-align: center;
        margin-top: 2rem;
      }

      .btn-load-more {
        padding: 0.75rem 2rem;
        background: #2c3e50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9375rem;
        font-weight: 500;
        transition: background-color 0.2s;
      }

      .btn-load-more:hover {
        background: #1a252f;
      }

      @media (max-width: 1024px) {
        .content-layout {
          flex-direction: column-reverse;
        }

        .sidebar {
          width: 100%;
          position: static;
        }

        .category-list {
          flex-direction: row;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .category-item {
          width: auto;
        }
      }

      @media (max-width: 768px) {
        .page {
          padding: 1rem;
        }

        h1 {
          font-size: 1.5rem;
        }

        .grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }
      }
    `,
  ],
})
export class RecipeListComponent implements OnInit {
  readonly items = signal<RecipeListResponse['items']>([]);
  readonly nextToken = signal<string | undefined>(undefined);
  readonly loading = signal(false);
  readonly favoritesOnly = signal(false);
  readonly progress = useFakeProgress();
  readonly selectedCategory = signal<string | null>(null);
  readonly sortKey = signal<string>('createdAt-desc');
  searchQ = '';

  readonly categories = computed(() => {
    const countMap = new Map<string, number>();
    for (const item of this.items()) {
      for (const cat of item.categories ?? []) {
        countMap.set(cat, (countMap.get(cat) ?? 0) + 1);
      }
    }
    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  });

  readonly filteredItems = computed(() => {
    const category = this.selectedCategory();
    let result = category
      ? this.items().filter((item) => item.categories?.includes(category))
      : [...this.items()];

    const sort = this.sortKey();
    const [field, dir] = sort.split('-') as [string, string];
    result.sort((a, b) => {
      let cmp: number;
      if (field === 'title') {
        cmp = a.title.localeCompare(b.title, 'ja');
      } else {
        cmp = a.createdAt.localeCompare(b.createdAt);
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return result;
  });

  constructor(
    private recipe: RecipeService,
    protected auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) return;
    this.load();
  }

  load(): void {
    this.nextToken.set(undefined);
    this.loading.set(true);
    this.progress.start();
    this.recipe.list({
      q: this.searchQ || undefined,
      favoritesOnly: this.favoritesOnly() || undefined,
    }).subscribe((res) => {
      this.progress.complete();
      this.items.set(res.items);
      this.nextToken.set(res.nextToken);
      this.loading.set(false);
    });
  }

  loadMore(): void {
    const token = this.nextToken();
    if (!token) return;
    this.loading.set(true);
    this.progress.start();
    this.recipe.list({
      q: this.searchQ || undefined,
      nextToken: token,
      favoritesOnly: this.favoritesOnly() || undefined,
    }).subscribe((res) => {
      this.progress.complete();
      this.items.update((prev) => [...prev, ...res.items]);
      this.nextToken.set(res.nextToken);
      this.loading.set(false);
    });
  }

  toggleFavoritesFilter(): void {
    this.favoritesOnly.update((v) => !v);
    this.load();
  }

  selectCategory(category: string | null): void {
    this.selectedCategory.set(category);
  }

  toggleFavorite(event: Event, recipe: Recipe): void {
    event.preventDefault();
    event.stopPropagation();

    const newValue = !recipe.isFavorite;
    this.recipe.setFavorite(recipe.recipeId, newValue).subscribe({
      next: (updated) => {
        this.items.update((items) =>
          items.map((item) => (item.recipeId === updated.recipeId ? updated : item))
        );
      },
      error: (error) => {
        console.error('Error toggling favorite:', error);
      },
    });
  }

  logout(): void {
    this.auth.signOut();
    this.router.navigate(['/']);
  }
}
