import type { APIGatewayProxyEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AppError } from './error-handler.middleware.js';

const USER_POOL_ID = process.env.USER_POOL_ID || '';
const REGION = process.env.REGION || 'ap-southeast-2';

const client = jwksClient({
  jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getKey(header: any, callback: any): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function verifyToken(event: APIGatewayProxyEvent): Promise<string> {
  const authHeader = event.headers.Authorization || event.headers.authorization;

  if (!authHeader) {
    throw new AppError(401, 'Authorization header is required');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'Authorization header must use Bearer scheme');
  }

  const token = authHeader.slice(7);

  if (!token) {
    throw new AppError(401, 'Token is required');
  }

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
      },
      (err, decoded) => {
        if (err) {
          reject(new AppError(401, 'Invalid or expired token'));
          return;
        }

        const payload = decoded as any;
        const userId = payload.sub;

        if (!userId) {
          reject(new AppError(401, 'Invalid token payload'));
          return;
        }

        resolve(userId);
      }
    );
  });
}
