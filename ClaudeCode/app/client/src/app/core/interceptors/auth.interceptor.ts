import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip auth for S3 requests (presigned URLs already include auth)
  if (req.url.includes('.s3.') || req.url.includes('s3.amazonaws.com')) {
    return next(req);
  }

  if (!authService.isLoggedIn()) {
    return next(req);
  }

  return from(authService.getAccessToken()).pipe(
    switchMap((token) => {
      if (token) {
        const clonedReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`),
        });
        return next(clonedReq);
      }
      return next(req);
    })
  );
};
