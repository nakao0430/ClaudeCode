import { Component, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../../core/services/upload.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="image-upload">
      <div class="upload-area">
        @if (!previewUrl()) {
          <div class="upload-placeholder" (click)="fileInput.click()">
            <div class="upload-icon">📷</div>
            <p>画像をアップロード</p>
            <p class="upload-hint">クリックして画像を選択</p>
            <p class="upload-format">JPEG, PNG, WebP (最大5MB)</p>
          </div>
        } @else {
          <div class="preview-container">
            <img [src]="previewUrl()" alt="プレビュー" class="preview-image" />
            <button
              type="button"
              class="remove-button"
              (click)="removeImage()"
              [disabled]="uploading()"
            >
              ✕
            </button>
          </div>
        }

        <input
          #fileInput
          type="file"
          accept="image/jpeg,image/png,image/webp"
          (change)="onFileSelected($event)"
          style="display: none"
        />
      </div>

      @if (uploading()) {
        <div class="upload-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="uploadProgress()"
            ></div>
          </div>
          <p class="progress-text">アップロード中... {{ uploadProgress() }}%</p>
        </div>
      }

      @if (error()) {
        <div class="error-message">{{ error() }}</div>
      }
    </div>
  `,
  styles: [
    `
      .image-upload {
        width: 100%;
        max-width: 400px;
      }

      .upload-area {
        border: 2px dashed #cbd5e0;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        transition: border-color 0.2s;
      }

      .upload-area:hover {
        border-color: #4299e1;
      }

      .upload-placeholder {
        cursor: pointer;
        padding: 40px 20px;
      }

      .upload-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .upload-placeholder p {
        margin: 8px 0;
        color: #4a5568;
      }

      .upload-hint {
        font-weight: 500;
      }

      .upload-format {
        font-size: 0.875rem;
        color: #718096;
      }

      .preview-container {
        position: relative;
        display: inline-block;
      }

      .preview-image {
        max-width: 100%;
        max-height: 300px;
        border-radius: 8px;
        object-fit: cover;
      }

      .remove-button {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.6);
        color: white;
        border: none;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
      }

      .remove-button:hover:not(:disabled) {
        background-color: rgba(0, 0, 0, 0.8);
      }

      .remove-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .upload-progress {
        margin-top: 16px;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background-color: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background-color: #4299e1;
        transition: width 0.3s ease;
      }

      .progress-text {
        margin-top: 8px;
        font-size: 0.875rem;
        color: #4a5568;
        text-align: center;
      }

      .error-message {
        margin-top: 12px;
        padding: 12px;
        background-color: #fed7d7;
        color: #c53030;
        border-radius: 4px;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class ImageUploadComponent {
  private readonly uploadService = inject(UploadService);

  // Signals
  previewUrl = signal<string | null>(null);
  uploading = signal(false);
  uploadProgress = signal(0);
  error = signal<string | null>(null);

  // Output
  imageUploaded = output<string>();

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.error.set('JPG、PNG、WebP形式の画像のみアップロードできます');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.error.set('ファイルサイズは5MB以下にしてください');
      return;
    }

    // Clear previous error
    this.error.set(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to S3
    this.uploading.set(true);
    this.uploadProgress.set(0);

    this.uploadService.uploadImage(file).subscribe({
      next: (progress) => {
        this.uploadProgress.set(progress.progress);
        if (progress.imageUrl) {
          this.uploading.set(false);
          this.imageUploaded.emit(progress.imageUrl);
        }
      },
      error: (err) => {
        console.error('Upload error:', err);
        this.error.set('アップロードに失敗しました。もう一度お試しください。');
        this.uploading.set(false);
        this.previewUrl.set(null);
      },
    });
  }

  removeImage(): void {
    this.previewUrl.set(null);
    this.error.set(null);
    this.imageUploaded.emit('');
  }
}
