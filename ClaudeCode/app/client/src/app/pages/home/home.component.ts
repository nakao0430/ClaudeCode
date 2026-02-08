import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="home">
      <h1>レシピ管理アプリ</h1>
      <p class="description">
        あなたのお気に入りのレシピを保存・管理できるアプリケーションです。
      </p>

      @if (auth.isLoggedIn()) {
        <div class="actions">
          <a routerLink="/recipes" class="btn btn-primary">レシピ一覧を見る</a>
          <a routerLink="/recipes/new" class="btn btn-secondary">新しいレシピを作成</a>
        </div>
        <p class="user-info">
          ログイン中: {{ auth.currentUser()?.email }}
        </p>
      } @else {
        <div class="actions">
          <a routerLink="/login" class="btn btn-primary">ログイン / サインアップ</a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .home {
        max-width: 900px;
        margin: 0 auto;
        padding: 5rem 2rem;
        text-align: center;
        min-height: 100vh;
        background: #f5f7fa;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }

      h1 {
        font-size: 3rem;
        margin-bottom: 1.5rem;
        color: #2c3e50;
        font-weight: 600;
        letter-spacing: -1px;
      }

      .description {
        font-size: 1.125rem;
        color: #5d6d7e;
        margin-bottom: 3rem;
        max-width: 600px;
        line-height: 1.7;
      }

      .actions {
        display: flex;
        gap: 1.25rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      .btn {
        padding: 0.875rem 2rem;
        border-radius: 4px;
        text-decoration: none;
        font-size: 1rem;
        font-weight: 500;
        transition: background-color 0.2s, transform 0.2s;
        display: inline-block;
      }

      .btn:hover {
        transform: translateY(-1px);
      }

      .btn-primary {
        background: #2c3e50;
        color: white;
      }

      .btn-primary:hover {
        background: #1a252f;
      }

      .btn-secondary {
        background: #d4a574;
        color: white;
      }

      .btn-secondary:hover {
        background: #c4945f;
      }

      .user-info {
        margin-top: 3rem;
        color: #5d6d7e;
        font-size: 0.9375rem;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      @media (max-width: 768px) {
        .home {
          padding: 3rem 1rem;
        }

        h1 {
          font-size: 2rem;
        }

        .description {
          font-size: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          font-size: 0.9375rem;
        }
      }
    `,
  ],
})
export class HomeComponent {
  constructor(protected auth: AuthService) {}
}
