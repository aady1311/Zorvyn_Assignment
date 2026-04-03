import { NextRequest, NextResponse } from 'next/server';
import { query, type DbParam } from '@/lib/db/mysql';
import { withAuth } from '@/lib/auth/middleware';
import { createRecordSchema, recordQuerySchema } from '@/lib/validators/record.schema';
import { ALL_ROLES, ANALYST_PLUS } from '@/lib/rbac/permissions';
import { errorResponse } from '@/lib/utils';
import type { JwtPayload, FinancialRecord } from '@/types';

type Roles = ('viewer' | 'analyst' | 'admin')[];

export const GET = withAuth(async (req: NextRequest, { user }: { user: JwtPayload }) => {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = recordQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { type, category, date_from, date_to, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = ['deleted_at IS NULL'];
    const params: DbParam[] = [];

    if (user.role === 'viewer') { conditions.push('user_id = ?'); params.push(user.userId); }
    if (type) { conditions.push('type = ?'); params.push(type); }
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (date_from) { conditions.push('date >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('date <= ?'); params.push(date_to); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [rows, countRows] = await Promise.all([
      query<FinancialRecord>(`SELECT * FROM financial_records ${where} ORDER BY date DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query<{ total: number }>(`SELECT COUNT(*) AS total FROM financial_records ${where}`, params),
    ]);

    return NextResponse.json({ success: true, data: rows, meta: { page, limit, total: countRows[0]?.total ?? 0 } });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ALL_ROLES as unknown as Roles);

export const POST = withAuth(async (req: NextRequest, { user }: { user: JwtPayload }) => {
  try {
    const body = await req.json();
    const parsed = createRecordSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const { amount, type, category, date, notes } = parsed.data;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await query(
      'INSERT INTO financial_records (id, user_id, amount, type, category, date, notes, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)',
      [id, user.userId, amount, type, category, date, notes ?? null, now, now]
    );

    const record: FinancialRecord = { id, user_id: user.userId, amount, type, category, date, notes, deleted_at: null, created_at: now, updated_at: now };
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ANALYST_PLUS as unknown as Roles);
