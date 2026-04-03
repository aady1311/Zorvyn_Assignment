import { NextRequest, NextResponse } from 'next/server';
import { query, type DbParam } from '@/lib/db/mysql';
import { withAuth } from '@/lib/auth/middleware';
import { ALL_ROLES } from '@/lib/rbac/permissions';
import { errorResponse } from '@/lib/utils';
import type { JwtPayload, FinancialRecord } from '@/types';

type Roles = ('viewer' | 'analyst' | 'admin')[];

export const GET = withAuth(async (req: NextRequest, { user }: { user: JwtPayload }) => {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const date_from = searchParams.get('date_from') || defaultFrom;
    const date_to = searchParams.get('date_to') || defaultTo;

    const baseConditions = ['deleted_at IS NULL', 'date >= ?', 'date <= ?'];
    const baseParams: DbParam[] = [date_from, date_to];
    if (user.role === 'viewer') { baseConditions.push('user_id = ?'); baseParams.push(user.userId); }
    const baseWhere = `WHERE ${baseConditions.join(' AND ')}`;

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    const trendFrom = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
    const trendConditions = ['deleted_at IS NULL', 'date >= ?'];
    const trendParams: DbParam[] = [trendFrom];
    if (user.role === 'viewer') { trendConditions.push('user_id = ?'); trendParams.push(user.userId); }
    const trendWhere = `WHERE ${trendConditions.join(' AND ')}`;

    const [summaryRows, byCategoryRows, trendRows, recentRows] = await Promise.all([
      query<{ total_income: number; total_expenses: number; record_count: number }>(
        `SELECT
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses,
          COUNT(*) AS record_count
        FROM financial_records ${baseWhere}`,
        baseParams
      ),
      query<{ category: string; type: string; total: number; count: number }>(
        `SELECT category, type, SUM(amount) AS total, COUNT(*) AS count
        FROM financial_records ${baseWhere}
        GROUP BY category, type ORDER BY total DESC`,
        baseParams
      ),
      query<{ month: string; income: number; expenses: number }>(
        `SELECT
          SUBSTR(date, 1, 7) AS month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
        FROM financial_records ${trendWhere}
        GROUP BY SUBSTR(date, 1, 7) ORDER BY month ASC`,
        trendParams
      ),
      query<FinancialRecord>(
        `SELECT * FROM financial_records ${baseWhere} ORDER BY date DESC LIMIT 5`,
        baseParams
      ),
    ]);

    const s = summaryRows[0] ?? { total_income: 0, total_expenses: 0, record_count: 0 };
    const total_income = Number(s.total_income ?? 0);
    const total_expenses = Number(s.total_expenses ?? 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_income,
          total_expenses,
          net_balance: total_income - total_expenses,
          record_count: Number(s.record_count ?? 0),
        },
        by_category: byCategoryRows,
        monthly_trend: trendRows.map((r) => ({
          month: r.month,
          income: Number(r.income ?? 0),
          expenses: Number(r.expenses ?? 0),
          net: Number(r.income ?? 0) - Number(r.expenses ?? 0),
        })),
        recent_records: recentRows,
      },
    });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}, ALL_ROLES as unknown as Roles);
