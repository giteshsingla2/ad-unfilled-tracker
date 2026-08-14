import { NextRequest, NextResponse } from 'next/server';

const PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';
const COOKIE = 'dash_auth';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip the login page and API routes
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const auth = req.cookies.get(COOKIE);
  if (auth?.value === PASSWORD) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
