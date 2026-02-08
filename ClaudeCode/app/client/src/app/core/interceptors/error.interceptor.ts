import { inject } from '@angular/core';
import type { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.signOut();
        router.navigate(['/login']);
      }

      const message = error.error?.error || error.message || 'エラーが発生しました';
      console.error('HTTP Error:', message);

      return throwError(() => error);
    })
  );
};
