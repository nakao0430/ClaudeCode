import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let authServiceMock: { signOut: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    routerMock = { navigate: vi.fn() };
    authServiceMock = { signOut: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should sign out and redirect to /login on 401', () => {
    httpClient.get('/api/test').subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      },
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.signOut).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should not redirect on non-401 errors', () => {
    httpClient.get('/api/test').subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(500);
      },
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush({ error: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(authServiceMock.signOut).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should propagate the error to subscriber', () => {
    let receivedError: HttpErrorResponse | null = null;

    httpClient.get('/api/test').subscribe({
      error: (error: HttpErrorResponse) => {
        receivedError = error;
      },
    });

    const req = httpTesting.expectOne('/api/test');
    req.flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });

    expect(receivedError).not.toBeNull();
    expect(receivedError!.status).toBe(404);
  });
});
