import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // RBAC: Restricted admin routes require ADMIN role
    const adminOnlyRoutes = ['/admin/ai-config', '/admin/staff'];
    if (adminOnlyRoutes.some((route) => pathname.startsWith(route))) {
      if (payload.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
  }

  // Redirect /login to /admin if already logged in
  if (pathname === '/login') {
    const token = request.cookies.get('auth_token')?.value;
    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
