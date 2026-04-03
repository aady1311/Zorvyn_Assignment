import { NextRequest, NextResponse } from 'next/server';

// Edge middleware: lightweight check — full verification happens in withAuth HOF
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const publicPaths = ['/api/auth/login', '/api/auth/register'];
  if (publicPaths.includes(pathname)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
