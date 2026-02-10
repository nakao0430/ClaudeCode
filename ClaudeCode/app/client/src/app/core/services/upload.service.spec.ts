import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UploadService } from './upload.service';
import { environment } from '../config/environment';

describe('UploadService', () => {
  let service: UploadService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UploadService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('uploadImage', () => {
    it('should first request upload URL then upload to S3', () => {
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
      const results: any[] = [];

      service.uploadImage(file).subscribe((progress) => {
        results.push(progress);
      });

      // Step 1: Get upload URL
      const urlReq = httpTesting.expectOne(`${environment.apiUrl}/recipes/upload-url`);
      expect(urlReq.request.method).toBe('POST');
      expect(urlReq.request.body).toEqual({
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
        fileSize: 4, // "test" is 4 bytes
      });

      urlReq.flush({
        uploadUrl: 'https://s3.example.com/signed',
        imageUrl: 'https://s3.example.com/photo.jpg',
        key: 'recipes/user/abc.jpg',
      });

      // Step 2: Upload to S3
      const s3Req = httpTesting.expectOne('https://s3.example.com/signed');
      expect(s3Req.request.method).toBe('PUT');
      expect(s3Req.request.headers.get('Content-Type')).toBe('image/jpeg');

      s3Req.flush(null);
    });
  });
});
