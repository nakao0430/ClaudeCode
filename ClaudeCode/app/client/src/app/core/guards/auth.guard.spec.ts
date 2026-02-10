import { TestBed } from '@angular/core/testing';
import { Router, type UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authServiceMock: { isLoggedIn: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authServiceMock = { isLoggedIn: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: { createUrlTree: vi.fn().mockReturnValue('url-tree') } },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('should return true when logged in', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/recipes' } as any)
    );

    expect(result).toBe(true);
  });

  it('should redirect to /login with returnUrl when not logged in', () => {
    authServiceMock.isLoggedIn.mockReturnValue(false);

    TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/recipes' } as any)
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/recipes' },
    });
  });
});
