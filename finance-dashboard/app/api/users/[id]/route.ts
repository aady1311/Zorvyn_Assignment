import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, type DbParam } from '@/lib/db/mysql';
import { withAuth } from '@/lib/auth/middleware';
import { updateUserSchema } from '@/lib/validators/user.schema';
import { ALL_ROLES, ADMIN_ONLY } from '@/lib/rbac/permissions';
import { errorResponse } from '@/lib/utils';
import type { JwtPayload, User } from '@/types';

type Roles = ('viewer' | 'analyst' | 'admin')[];
type RouteCtx = { user: JwtPayload; params?: Record<string, string> };

export const GET = withAuth(async (_req: NextRequest, { user, params }: RouteCtx) => {
  try {
    const id = params?.id;
    if (user.role !== 'admin' && user.userId !== id) return errorResponse('Forbidden', 403);

    const row = await queryOne<User>(
      'SELECT id, email, name, role, status, created_at, updated_at FROM users WHERE id = ?',
      [id ?? '']
    );
    if (!row) return errorResponse('Resource not found', 404);
    return NextResponse.json({ success: true, data: row });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ALL_ROLES as unknown as Roles);

export const PATCH = withAuth(async (req: NextRequest, { user, params }: RouteCtx) => {
  try {
    const id = params?.id ?? '';
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const updates = parsed.data;
    if (user.role !== 'admin') {
      if (user.userId !== id) return errorResponse('Forbidden', 403);
      if (updates.role || updates.status) return errorResponse('You do not have permission to perform this action', 403);
    }

    const existing = await queryOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing) return errorResponse('Resource not found', 404);

    const fields: string[] = [];
    const params2: DbParam[] = [];
    if (updates.name) { fields.push('name = ?'); params2.push(updates.name); }
    if (updates.role) { fields.push('role = ?'); params2.push(updates.role); }
    if (updates.status) { fields.push('status = ?'); params2.push(updates.status); }
    fields.push('updated_at = ?');
    params2.push(new Date().toISOString());
    params2.push(id);

    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params2);

    const updated = await queryOne<User>(
      'SELECT id, email, name, role, status, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return NextResponse.json({ success: true, data: updated });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ALL_ROLES as unknown as Roles);

export const DELETE = withAuth(async (_req: NextRequest, { user, params }: RouteCtx) => {
  try {
    const id = params?.id ?? '';
    if (user.userId === id) return errorResponse('Cannot delete own account', 400);

    const existing = await queryOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing) return errorResponse('Resource not found', 404);

    await query('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: { message: 'User deleted' } });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ADMIN_ONLY as unknown as Roles);
