import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock S3
vi.mock('../../config/s3.config.js', () => ({
  s3Client: {},
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://bucket.s3.amazonaws.com/signed-url'),
}));

vi.stubEnv('IMAGE_BUCKET', 'test-bucket');
vi.stubEnv('REGION', 'ap-southeast-2');

const uploadService = await import('../../services/upload.service.js');

describe('generateUploadUrl', () => {
  it('should generate upload URL for valid JPEG', async () => {
    const result = await uploadService.generateUploadUrl('user-1', {
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
      fileSize: 1024 * 1024, // 1MB
    });

    expect(result.uploadUrl).toBe('https://bucket.s3.amazonaws.com/signed-url');
    expect(result.imageUrl).toContain('test-bucket');
    expect(result.imageUrl).toContain('recipes/user-1/');
    expect(result.key).toMatch(/^recipes\/user-1\/.*\.jpg$/);
  });

  it('should generate upload URL for PNG', async () => {
    const result = await uploadService.generateUploadUrl('user-1', {
      filename: 'image.png',
      contentType: 'image/png',
      fileSize: 2 * 1024 * 1024,
    });

    expect(result.key).toMatch(/\.png$/);
  });

  it('should generate upload URL for WebP', async () => {
    const result = await uploadService.generateUploadUrl('user-1', {
      filename: 'image.webp',
      contentType: 'image/webp',
      fileSize: 500000,
    });

    expect(result.key).toMatch(/\.webp$/);
  });

  it('should reject invalid content type', async () => {
    await expect(
      uploadService.generateUploadUrl('user-1', {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
      })
    ).rejects.toThrow('Invalid content type');
  });

  it('should reject file size exceeding 5MB', async () => {
    await expect(
      uploadService.generateUploadUrl('user-1', {
        filename: 'large.jpg',
        contentType: 'image/jpeg',
        fileSize: 6 * 1024 * 1024,
      })
    ).rejects.toThrow('File size exceeds maximum');
  });

  it('should reject missing file size', async () => {
    await expect(
      uploadService.generateUploadUrl('user-1', {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
        fileSize: 0,
      })
    ).rejects.toThrow('fileSize is required');
  });

  it('should reject negative file size', async () => {
    await expect(
      uploadService.generateUploadUrl('user-1', {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
        fileSize: -100,
      })
    ).rejects.toThrow('fileSize is required');
  });

  it('should sanitize file extension', async () => {
    const result = await uploadService.generateUploadUrl('user-1', {
      filename: 'file.J$P#G',
      contentType: 'image/jpeg',
      fileSize: 1024,
    });

    expect(result.key).toMatch(/\.[a-z0-9]+$/);
  });
});
