import { Injectable, signal } from '@angular/core';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { environment } from '../config/environment';
import type { User, LoginRequest, SignUpRequest } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _isLoggedIn = signal<boolean>(false);
  private _currentUser = signal<User | null>(null);
  private userPool: CognitoUserPool;
  private currentCognitoUser: CognitoUser | null = null;

  readonly isLoggedIn = this._isLoggedIn.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();

  constructor() {
    this.userPool = new CognitoUserPool({
      UserPoolId: environment.cognitoUserPoolId,
      ClientId: environment.cognitoClientId,
    });
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    const cognitoUser = this.userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.getSession(
        (err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session || !session.isValid()) {
            this._isLoggedIn.set(false);
            this._currentUser.set(null);
            return;
          }

          this.currentCognitoUser = cognitoUser;
          cognitoUser.getUserAttributes((err, attributes) => {
            if (err || !attributes) {
              this._isLoggedIn.set(false);
              this._currentUser.set(null);
              return;
            }

            const email =
              attributes.find((attr) => attr.Name === 'email')?.Value || '';
            const sub =
              attributes.find((attr) => attr.Name === 'sub')?.Value || '';

            this._currentUser.set({
              id: sub,
              email: email,
              username: cognitoUser.getUsername(),
            });
            this._isLoggedIn.set(true);
          });
        }
      );
    }
  }

  async signUp(request: SignUpRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const attributeList: CognitoUserAttribute[] = [
        new CognitoUserAttribute({
          Name: 'email',
          Value: request.email,
        }),
      ];

      this.userPool.signUp(
        request.email,
        request.password,
        attributeList,
        [],
        (err, result) => {
          if (err) {
            reject(new Error(err.message || 'サインアップに失敗しました'));
            return;
          }
          resolve();
        }
      );
    });
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: this.userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          reject(new Error(err.message || 'コードの確認に失敗しました'));
          return;
        }
        resolve();
      });
    });
  }

  async signIn(request: LoginRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: request.email,
        Password: request.password,
      });

      const userData = {
        Username: request.email,
        Pool: this.userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          this.currentCognitoUser = cognitoUser;
          cognitoUser.getUserAttributes((err, attributes) => {
            if (err || !attributes) {
              reject(new Error('ユーザー情報の取得に失敗しました'));
              return;
            }

            const email =
              attributes.find((attr) => attr.Name === 'email')?.Value || '';
            const sub =
              attributes.find((attr) => attr.Name === 'sub')?.Value || '';

            this._currentUser.set({
              id: sub,
              email: email,
              username: cognitoUser.getUsername(),
            });
            this._isLoggedIn.set(true);
            resolve();
          });
        },
        onFailure: (err) => {
          reject(new Error(err.message || 'ログインに失敗しました'));
        },
      });
    });
  }

  async signOut(): Promise<void> {
    if (this.currentCognitoUser) {
      this.currentCognitoUser.signOut();
    } else {
      const cognitoUser = this.userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }
    }
    this._isLoggedIn.set(false);
    this._currentUser.set(null);
    this.currentCognitoUser = null;
  }

  async getAccessToken(): Promise<string | null> {
    return new Promise((resolve) => {
      const cognitoUser =
        this.currentCognitoUser || this.userPool.getCurrentUser();
      if (!cognitoUser) {
        resolve(null);
        return;
      }

      cognitoUser.getSession(
        (err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session || !session.isValid()) {
            resolve(null);
            return;
          }
          resolve(session.getIdToken().getJwtToken());
        }
      );
    });
  }
}
