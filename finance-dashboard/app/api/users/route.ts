import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, queryOne, type DbParam } from '@/lib/db/mysql';
import { withAuth } from '@/lib/auth/middleware';
import { createUserSchema } from '@/lib/validators/user.schema';
import { ADMIN_ONLY } from '@/lib/rbac/permissions';
import { errorResponse } from '@/lib/utils';
import type { User } from '@/types';

type Roles = ('viewer' | 'analyst' | 'admin')[];

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: DbParam[] = [];
    if (role) { conditions.push('role = ?'); params.push(role); }
    if (status) { conditions.push('status = ?'); params.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, countRows] = await Promise.all([
      query<User>(`SELECT id, email, name, role, status, created_at, updated_at FROM users ${where} LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query<{ total: number }>(`SELECT COUNT(*) AS total FROM users ${where}`, params),
    ]);

    return NextResponse.json({ success: true, data: rows, meta: { page, limit, total: countRows[0]?.total ?? 0 } });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ADMIN_ONLY as unknown as Roles);

export const POST = withAuth(async (req: NextRequest) => {
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
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ADMIN_ONLY as unknown as Roles);
