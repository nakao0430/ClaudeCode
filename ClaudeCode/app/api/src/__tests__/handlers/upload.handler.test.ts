import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

vi.mock('../../middleware/auth.middleware.js', () => ({
  verifyToken: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('../../middleware/cors.middleware.js', () => ({
  handleOptionsRequest: vi.fn().mockReturnValue({ statusCode: 200, headers: {}, body: '' }),
  addCorsHeaders: vi.fn().mockImplementation((res) => res),
}));

vi.mock('../../services/upload.service.js', () => ({
  generateUploadUrl: vi.fn(),
}));

const { uploadHandler } = await import('../../handlers/upload.handler.js');
const uploadService = await import('../../services/upload.service.js');

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    headers: { Authorization: 'Bearer test-token', origin: 'http://localhost:4200' },
    path: '/recipes/upload-url',
    body: null,
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    ...overrides,
  };
}

describe('uploadHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /recipes/upload-url', () => {
    it('should generate upload URL', async () => {
      vi.mocked(uploadService.generateUploadUrl).mockResolvedValue({
        uploadUrl: 'https://s3.example.com/signed',
        imageUrl: 'https://s3.example.com/image.jpg',
        key: 'recipes/user-1/abc.jpg',
      });

      const result = await uploadHandler(
        makeEvent({
          body: JSON.stringify({
            filename: 'photo.jpg',
            contentType: 'image/jpeg',
            fileSize: 1024,
          }),
        })
      );

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).uploadUrl).toBe('https://s3.example.com/signed');
    });

    it('should return 400 for missing body', async () => {
      const result = await uploadHandler(makeEvent({ body: null }));
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid JSON', async () => {
      const result = await uploadHandler(makeEvent({ body: '{bad' }));
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for missing filename', async () => {
      const result = await uploadHandler(
        makeEvent({
          body: JSON.stringify({ contentType: 'image/jpeg', fileSize: 1024 }),
        })
      );
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for missing contentType', async () => {
      const result = await uploadHandler(
        makeEvent({
          body: JSON.stringify({ filename: 'photo.jpg', fileSize: 1024 }),
        })
      );
      expect(result.statusCode).toBe(400);
    });
  });

  describe('unsupported methods', () => {
    it('should return 405 for GET', async () => {
      const result = await uploadHandler(makeEvent({ httpMethod: 'GET' }));
      expect(result.statusCode).toBe(405);
    });
  });
});
