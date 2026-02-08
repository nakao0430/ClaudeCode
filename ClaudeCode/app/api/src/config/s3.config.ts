import { S3Client } from '@aws-sdk/client-s3';

const REGION = process.env.REGION || 'ap-southeast-2';

export const s3Client = new S3Client({
  region: REGION,
});
