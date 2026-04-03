import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import type { JwtPayload, UserRole } from '@/types';

type AuthedHandler = (
  req: NextRequest,
  ctx: { user: JwtPayload; params?: Record<string, string> }
) => Promise<NextResponse>;

export function withAuth(handler: AuthedHandler, allowedRoles?: UserRole[]) {
  return async (req: NextRequest, ctx?: { params?: Record<string, string> }) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 401 });
    }
    try {
      const token = authHeader.slice(7);
      const user = verifyToken(token);
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
      return handler(req, { user, params: ctx?.params });
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
  };
}
