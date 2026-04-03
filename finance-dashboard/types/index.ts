export type UserRole = 'viewer' | 'analyst' | 'admin';
export type UserStatus = 'active' | 'inactive';
export type RecordType = 'income' | 'expense';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

// password_hash is NEVER in this type --- only in DB layer
export interface FinancialRecord {
  id: string;
  user_id: string;
  amount: number;
  type: RecordType;
  category: string;
  date: string;
  notes?: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { page?: number; limit?: number; total?: number };
}
