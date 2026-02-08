import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="login-container">
      <div class="login-card">
        @if (showConfirmation()) {
          <h1>メールアドレスの確認</h1>

          <form (ngSubmit)="confirmEmail()" #confirmForm="ngForm">
            <p class="info-text">
              {{ email }} に確認コードを送信しました。<br>
              メールを確認して、コードを入力してください。
            </p>

            <div class="form-group">
              <label for="code">確認コード</label>
              <input
                type="text"
                id="code"
                name="code"
                [(ngModel)]="confirmationCode"
                required
                placeholder="6桁の確認コード"
                maxlength="6"
              />
            </div>

            @if (errorMessage()) {
              <div class="error-message">{{ errorMessage() }}</div>
            }

            @if (successMessage()) {
              <div class="success-message">{{ successMessage() }}</div>
            }

            <button
              type="submit"
              class="btn-submit"
              [disabled]="!confirmForm.valid || loading()"
            >
              {{ loading() ? '確認中...' : '確認' }}
            </button>
          </form>

          <div class="back-link" style="margin-top: 1rem;">
            <a href="#" (click)="toggleMode($event)">ログインに戻る</a>
          </div>
        } @else {
          <h1>{{ isSignUpMode() ? 'サインアップ' : 'ログイン' }}</h1>

          <form (ngSubmit)="submit()" #form="ngForm">
            <div class="form-group">
              <label for="email">メールアドレス</label>
              <input
                type="email"
                id="email"
                name="email"
                [(ngModel)]="email"
                required
                email
                placeholder="example@example.com"
              />
            </div>

            <div class="form-group">
              <label for="password">パスワード</label>
              <input
                type="password"
                id="password"
                name="password"
                [(ngModel)]="password"
                required
                minlength="8"
                placeholder="8文字以上"
              />
            </div>

            @if (errorMessage()) {
              <div class="error-message">{{ errorMessage() }}</div>
            }

            @if (successMessage()) {
              <div class="success-message">{{ successMessage() }}</div>
            }

            <button
              type="submit"
              class="btn-submit"
              [disabled]="!form.valid || loading()"
            >
              {{ loading() ? '処理中...' : isSignUpMode() ? 'サインアップ' : 'ログイン' }}
            </button>
          </form>

          <div class="toggle-mode">
            @if (isSignUpMode()) {
              <p>
                すでにアカウントをお持ちですか？
                <a href="#" (click)="toggleMode($event)">ログイン</a>
              </p>
            } @else {
              <p>
                アカウントをお持ちでないですか？
                <a href="#" (click)="toggleMode($event)">サインアップ</a>
              </p>
            }
          </div>

          <div class="back-link">
            <a routerLink="/">トップページに戻る</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .login-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: #f5f7fa;
      }

      .login-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        padding: 2.5rem;
        max-width: 420px;
        width: 100%;
        border-left: 4px solid #d4a574;
      }

      h1 {
        text-align: center;
        margin-bottom: 2rem;
        color: #2c3e50;
        font-size: 1.75rem;
        font-weight: 600;
      }

      .info-text {
        text-align: center;
        margin-bottom: 1.5rem;
        color: #5d6d7e;
        line-height: 1.6;
      }

      .form-group {
        margin-bottom: 1.25rem;
      }

      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #2c3e50;
        font-size: 0.9375rem;
      }

      input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.9375rem;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      input:focus {
        outline: none;
        border-color: #2c3e50;
        box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
      }

      .error-message {
        background: #e74c3c;
        color: white;
        padding: 0.875rem;
        border-radius: 4px;
        margin-bottom: 1rem;
        font-weight: 500;
        font-size: 0.9375rem;
      }

      .success-message {
        background: #27ae60;
        color: white;
        padding: 0.875rem;
        border-radius: 4px;
        margin-bottom: 1rem;
        font-weight: 500;
        font-size: 0.9375rem;
      }

      .btn-submit {
        width: 100%;
        padding: 0.875rem;
        background: #2c3e50;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .btn-submit:hover:not(:disabled) {
        background: #1a252f;
      }

      .btn-submit:disabled {
        background: #95a5a6;
        cursor: not-allowed;
      }

      .toggle-mode {
        text-align: center;
        margin-top: 1.75rem;
        padding-top: 1.75rem;
        border-top: 1px solid #e5e7eb;
      }

      .toggle-mode p {
        color: #5d6d7e;
        font-size: 0.9375rem;
      }

      .toggle-mode a {
        color: #2c3e50;
        text-decoration: none;
        font-weight: 600;
        transition: color 0.2s;
      }

      .toggle-mode a:hover {
        color: #d4a574;
      }

      .back-link {
        text-align: center;
        margin-top: 1.25rem;
      }

      .back-link a {
        color: #9ca3af;
        text-decoration: none;
        font-size: 0.875rem;
        transition: color 0.2s;
      }

      .back-link a:hover {
        color: #5d6d7e;
      }

      @media (max-width: 768px) {
        .login-container {
          padding: 1rem;
        }

        .login-card {
          padding: 2rem;
        }

        h1 {
          font-size: 1.5rem;
        }
      }
    `,
  ],
})
export class LoginComponent {
  email = '';
  password = '';
  confirmationCode = '';
  isSignUpMode = signal(false);
  showConfirmation = signal(false);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleMode(event: Event): void {
    event.preventDefault();
    this.isSignUpMode.update((v) => !v);
    this.showConfirmation.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.confirmationCode = '';
  }

  async submit(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      if (this.isSignUpMode()) {
        await this.authService.signUp({
          email: this.email,
          password: this.password,
        });
        this.successMessage.set(
          'サインアップが完了しました。確認コードをメールで送信しました。'
        );
        this.showConfirmation.set(true);
      } else {
        await this.authService.signIn({
          email: this.email,
          password: this.password,
        });
        this.router.navigate(['/recipes']);
      }
    } catch (error: any) {
      this.errorMessage.set(error.message);
    } finally {
      this.loading.set(false);
    }
  }

  async confirmEmail(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.authService.confirmSignUp(this.email, this.confirmationCode);
      this.successMessage.set(
        'メールアドレスが確認されました。ログインしてください。'
      );
      setTimeout(() => {
        this.showConfirmation.set(false);
        this.isSignUpMode.set(false);
        this.password = '';
        this.confirmationCode = '';
        this.successMessage.set('');
      }, 2000);
    } catch (error: any) {
      this.errorMessage.set(error.message);
    } finally {
      this.loading.set(false);
    }
  }
}
