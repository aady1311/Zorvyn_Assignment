import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { queryOne } from '@/lib/db/mysql';
import { signToken } from '@/lib/auth/jwt';
import { loginSchema } from '@/lib/validators/user.schema';
import { errorResponse } from '@/lib/utils';
import type { User } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { email, password } = parsed.data;

    const dbUser = await queryOne<User & { password_hash: string }>(
      'SELECT id, email, name, role, status, password_hash, created_at, updated_at FROM users WHERE email = ?',
      [email]
    );
    if (!dbUser) return errorResponse('Invalid credentials', 401);
    if (dbUser.status === 'inactive') return errorResponse('User account is inactive', 403);

    const valid = await bcrypt.compare(password, dbUser.password_hash);
    if (!valid) return errorResponse('Invalid credentials', 401);

    const { password_hash: _, ...user } = dbUser;
    const token = signToken({ userId: user.id, role: user.role, email: user.email });

    return NextResponse.json({ success: true, data: { user, token } });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}
