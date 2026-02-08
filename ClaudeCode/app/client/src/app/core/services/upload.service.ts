import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, switchMap, map } from 'rxjs';
import { environment } from '../config/environment';

export interface UploadUrlResponse {
  uploadUrl: string;
  imageUrl: string;
  key: string;
}

export interface UploadProgress {
  progress: number;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Upload an image file to S3
   * @param file Image file to upload
   * @returns Observable that emits upload progress and final image URL
   */
  uploadImage(file: File): Observable<UploadProgress> {
    // First, get the signed URL from the API
    return this.getUploadUrl(file.name, file.type, file.size).pipe(
      switchMap((response) => {
        // Then upload the file to S3 using the signed URL
        return this.uploadToS3(file, response.uploadUrl).pipe(
          map((progress) => ({
            progress,
            imageUrl: progress === 100 ? response.imageUrl : undefined,
          }))
        );
      })
    );
  }

  /**
   * Get signed upload URL from API
   */
  private getUploadUrl(
    filename: string,
    contentType: string,
    fileSize: number
  ): Observable<UploadUrlResponse> {
    return this.http.post<UploadUrlResponse>(
      `${this.apiUrl}/recipes/upload-url`,
      {
        filename,
        contentType,
        fileSize,
      }
    );
  }

  /**
   * Upload file to S3 using signed URL
   */
  private uploadToS3(file: File, uploadUrl: string): Observable<number> {
    return this.http
      .put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        map((event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress) {
            const progress = event.total
              ? Math.round((100 * event.loaded) / event.total)
              : 0;
            return progress;
          } else if (event.type === HttpEventType.Response) {
            return 100;
          }
          return 0;
        })
      );
  }
}
