export const ROLES = { VIEWER: 'viewer', ANALYST: 'analyst', ADMIN: 'admin' } as const;

export const ANALYST_PLUS = ['analyst', 'admin'] as const;
export const ADMIN_ONLY = ['admin'] as const;
export const ALL_ROLES = ['viewer', 'analyst', 'admin'] as const;
