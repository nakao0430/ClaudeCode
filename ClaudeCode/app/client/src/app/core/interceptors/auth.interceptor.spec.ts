import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let authServiceMock: {
    isLoggedIn: ReturnType<typeof vi.fn>;
    getAccessToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      isLoggedIn: vi.fn(),
      getAccessToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should add Authorization header when logged in', async () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    authServiceMock.getAccessToken.mockResolvedValue('test-id-token');

    httpClient.get('/api/test').subscribe();
    await flushMicrotasks();

    const req = httpTesting.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-id-token');
    req.flush({});
  });

  it('should not add Authorization header when not logged in', () => {
    authServiceMock.isLoggedIn.mockReturnValue(false);

    httpClient.get('/api/test').subscribe();

    const req = httpTesting.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should skip S3 requests (s3.amazonaws.com)', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    authServiceMock.getAccessToken.mockResolvedValue('token');

    httpClient.put('https://bucket.s3.amazonaws.com/key', {}).subscribe();

    const req = httpTesting.expectOne('https://bucket.s3.amazonaws.com/key');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should skip S3 requests (.s3. in URL)', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    authServiceMock.getAccessToken.mockResolvedValue('token');

    httpClient.put('https://bucket.s3.ap-southeast-2.amazonaws.com/key', {}).subscribe();

    const req = httpTesting.expectOne('https://bucket.s3.ap-southeast-2.amazonaws.com/key');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should pass request through when token is null', async () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    authServiceMock.getAccessToken.mockResolvedValue(null);

    httpClient.get('/api/test').subscribe();
    await flushMicrotasks();

    const req = httpTesting.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
