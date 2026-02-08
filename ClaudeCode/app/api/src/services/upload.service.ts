import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ulid } from 'ulid';
import { s3Client } from '../config/s3.config.js';
import { AppError } from '../middleware/error-handler.middleware.js';

const BUCKET_NAME = process.env.IMAGE_BUCKET || '';
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadUrlRequest {
  filename: string;
  contentType: string;
  fileSize: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  imageUrl: string;
  key: string;
}

export async function generateUploadUrl(
  userId: string,
  request: UploadUrlRequest
): Promise<UploadUrlResponse> {
  // Validate content type
  if (!ALLOWED_CONTENT_TYPES.includes(request.contentType)) {
    throw new AppError(
      400,
      `Invalid content type. Allowed types: ${ALLOWED_CONTENT_TYPES.join(', ')}`
    );
  }

  // Validate file size
  if (!request.fileSize || typeof request.fileSize !== 'number' || request.fileSize <= 0) {
    throw new AppError(400, 'fileSize is required and must be a positive number');
  }
  if (request.fileSize > MAX_FILE_SIZE) {
    throw new AppError(400, `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Sanitize filename and generate unique key
  const fileExtension = request.filename.split('.').pop() || 'jpg';
  const sanitizedExtension = fileExtension.toLowerCase().replace(/[^a-z0-9]/g, '');
  const uniqueId = ulid();
  const key = `recipes/${userId}/${uniqueId}.${sanitizedExtension}`;

  try {
    // Generate signed URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: request.contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900, // 15 minutes
    });

    // Generate public URL for the image
    const region = process.env.REGION || 'ap-southeast-2';
    const imageUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      imageUrl,
      key,
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new AppError(500, 'Failed to generate upload URL');
  }
}
