import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, type DbParam } from '@/lib/db/mysql';
import { withAuth } from '@/lib/auth/middleware';
import { updateRecordSchema } from '@/lib/validators/record.schema';
import { ALL_ROLES, ANALYST_PLUS } from '@/lib/rbac/permissions';
import { errorResponse } from '@/lib/utils';
import type { JwtPayload, FinancialRecord } from '@/types';

type Roles = ('viewer' | 'analyst' | 'admin')[];
type RouteCtx = { user: JwtPayload; params?: Record<string, string> };

function getActive(id: string) {
  return queryOne<FinancialRecord>('SELECT * FROM financial_records WHERE id = ? AND deleted_at IS NULL', [id]);
}

export const GET = withAuth(async (_req: NextRequest, { user, params }: RouteCtx) => {
  try {
    const record = await getActive(params?.id ?? '');
    if (!record) return errorResponse('Resource not found', 404);
    if (user.role === 'viewer' && record.user_id !== user.userId) return errorResponse('Resource not found', 404);
    return NextResponse.json({ success: true, data: record });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ALL_ROLES as unknown as Roles);

export const PATCH = withAuth(async (req: NextRequest, { user, params }: RouteCtx) => {
  try {
    const id = params?.id ?? '';
    const record = await getActive(id);
    if (!record) return errorResponse('Resource not found', 404);
    if (user.role === 'analyst' && record.user_id !== user.userId) {
      return errorResponse('You do not have permission to perform this action', 403);
    }

    const body = await req.json();
    const parsed = updateRecordSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const updates = parsed.data;
    const fields: string[] = [];
    const params2: DbParam[] = [];

    if (updates.amount !== undefined) { fields.push('amount = ?'); params2.push(updates.amount); }
    if (updates.type) { fields.push('type = ?'); params2.push(updates.type); }
    if (updates.category) { fields.push('category = ?'); params2.push(updates.category); }
    if (updates.date) { fields.push('date = ?'); params2.push(updates.date); }
    if (updates.notes !== undefined) { fields.push('notes = ?'); params2.push(updates.notes ?? null); }
    fields.push('updated_at = ?');
    params2.push(new Date().toISOString());
    params2.push(id);

    await query(`UPDATE financial_records SET ${fields.join(', ')} WHERE id = ?`, params2);
    const updated = await getActive(id);
    return NextResponse.json({ success: true, data: updated });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ANALYST_PLUS as unknown as Roles);

export const DELETE = withAuth(async (_req: NextRequest, { user, params }: RouteCtx) => {
  try {
    const id = params?.id ?? '';
    const record = await getActive(id);
    if (!record) return errorResponse('Resource not found', 404);
    if (user.role === 'analyst' && record.user_id !== user.userId) {
      return errorResponse('You do not have permission to perform this action', 403);
    }

    const now = new Date().toISOString();
    await query('UPDATE financial_records SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
    return NextResponse.json({ success: true, data: { message: 'Record deleted' } });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ANALYST_PLUS as unknown as Roles);
