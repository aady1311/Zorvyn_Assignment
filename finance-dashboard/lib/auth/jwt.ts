import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JwtPayload } from '@/types';

export function signToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'] };
  return jwt.sign(payload, process.env.JWT_SECRET!, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
}
