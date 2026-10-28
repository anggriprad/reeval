import { NextResponse, type NextRequest } from 'next/server';
import { isRouteAllowed, normalizeRole } from '@/lib/roles';
import {
  getRequiredPermissionForPath,
  hasPermission,
  hasAnyPermission,
} from '@/lib/permissions';

const PUBLIC_PATHS = ['/login', '/signin', '/403'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get('token')?.value ||
    request.cookies.get('cookieKey')?.value;

  const mustChangePassword =
    request.cookies.get('mustChangePassword')?.value === '1';

  const isPublicPath = PUBLIC_PATHS.some(
    p => pathname === p || pathname.startsWith(`${p}/`)
  );

  const isChangePasswordPath =
    pathname === '/change-password' || pathname.startsWith('/change-password/');

  // 1. Unauthenticated Gatekeeper
  if (!token) {
    if (isPublicPath) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', request.url);
    if (!isChangePasswordPath) {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Mandatory Password Change Gatekeeper
  if (mustChangePassword) {
    if (!isChangePasswordPath) {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }
  } else if (isChangePasswordPath) {
    return NextResponse.redirect(new URL('/', request.url));
  } else if (pathname === '/login' || pathname === '/signin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3. Permission & Role Access Gatekeeper (Anti Tembak URL -> 403 Access Denied)
  if (!isPublicPath && !isChangePasswordPath && pathname !== '/') {
    const rawRole = request.cookies.get('role')?.value;
    const roles = rawRole
      ? rawRole.split(',').map(r => r.trim()).filter(Boolean)
      : [];

    let userPerms: string[] = [];
    const rawPerms = request.cookies.get('permissions')?.value;
    if (rawPerms) {
      try {
        userPerms = JSON.parse(rawPerms);
      } catch {
        userPerms = rawPerms.split(',').map(p => p.trim());
      }
    }

    const isSuperOrAdmin =
      roles.some(r => {
        const norm = normalizeRole(r);
        return norm === 'ADMIN' || norm === 'SUPER_ADMIN';
      }) ||
      userPerms.includes('*') ||
      userPerms.includes('system:*');

    if (!isSuperOrAdmin) {
      const requiredPerm = getRequiredPermissionForPath(pathname);
      let isPermitted = false;

      if (userPerms.length > 0 && requiredPerm) {
        if (Array.isArray(requiredPerm)) {
          isPermitted = hasAnyPermission(userPerms, requiredPerm, isSuperOrAdmin);
        } else {
          isPermitted = hasPermission(userPerms, requiredPerm, isSuperOrAdmin);
        }
      } else if (roles.length > 0) {
        isPermitted = isRouteAllowed(roles, pathname);
      }

      if (!isPermitted) {
        const deniedUrl = new URL('/403', request.url);
        deniedUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(deniedUrl);
      }
    }
  }

  // 4. Header Forwarding
  const activeCompanyId = request.cookies.get('activeCompanyId')?.value;
  const requestHeaders = new Headers(request.headers);
  if (activeCompanyId) {
    requestHeaders.set('x-company-id', activeCompanyId);
  }
  if (token) {
    requestHeaders.set('authorization', `Bearer ${token}`);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
