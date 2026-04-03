import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '@/lib/db/mysql';
import { signToken } from '@/lib/auth/jwt';
import { createUserSchema } from '@/lib/validators/user.schema';
import { errorResponse } from '@/lib/utils';
import type { User } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { email, password, name, role } = parsed.data;

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return errorResponse('Email already in use', 409);

    const password_hash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await query(
      'INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, email, password_hash, name, role, 'active', now, now]
    );

    const user: User = { id, email, name, role, status: 'active', created_at: now, updated_at: now };
    const token = signToken({ userId: id, role, email });

    return NextResponse.json({ success: true, data: { user, token } }, { status: 201 });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}
