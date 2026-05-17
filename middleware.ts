import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import {
  ADMIN_SESSION_TTL_SECONDS,
  shouldRotateAdminSession,
  signAdminSessionJwt,
  verifyAdminSessionJwt,
} from '@/lib/auth/admin-jwt';

const ADMIN_SESSION_COOKIE = 'aq_admin_session';

const ADMIN_UI_MODULES = new Set(['tokens', 'bridge-config', 'audit-logs']);
const ADMIN_API_POLICIES: Record<string, Set<string>> = {
  '/api/admin/tokens': new Set(['GET', 'POST', 'PUT', 'DELETE']),
  '/api/admin/bridge-config': new Set(['GET', 'POST', 'PUT', 'DELETE']),
  '/api/admin/audit-logs': new Set(['GET']),
};

function getInternalAuditSecret(): string {
  if (process.env.INTERNAL_AUDIT_SECRET) {
    return process.env.INTERNAL_AUDIT_SECRET;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'dev-only-internal-audit-secret';
  }

  throw new Error('INTERNAL_AUDIT_SECRET is required in production');
}

function normalizeAddress(value: string): string {
  return value.toLowerCase();
}

function isAddressSegment(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function extractAddressFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const found = segments.find(isAddressSegment);
  return found ? normalizeAddress(found) : null;
}

function getAdminUiModule(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return '';
  }

  return segments[1] || '';
}

async function withSlidingCookie(response: NextResponse, token: string) {
  const claims = await verifyAdminSessionJwt(token);
  if (!claims) {
    return response;
  }

  if (!shouldRotateAdminSession(claims)) {
    return response;
  }

  const nextExpiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000);
  const rotatedToken = await signAdminSessionJwt({
    sessionId: claims.sessionId,
    userId: claims.userId,
    address: claims.address,
    role: claims.role,
    expiresAt: nextExpiresAt,
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, rotatedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: nextExpiresAt,
  });

  return response;
}

function isAdminApiRouteAllowed(pathname: string, method: string): boolean {
  const allowedMethods = ADMIN_API_POLICIES[pathname];
  if (!allowedMethods) {
    return false;
  }

  return allowedMethods.has(method.toUpperCase());
}

async function logSecurityEvent(request: NextRequest, payload: {
  action: string;
  detail: string;
  adminAddress?: string;
  metadata?: unknown;
}) {
  try {
    const url = new URL('/api/internal/security-event', request.nextUrl.origin);
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-audit-secret': getInternalAuditSecret(),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Ignore logging failures to avoid blocking request flow.
  }
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const validSession = token ? await verifyAdminSessionJwt(token) : null;
  const hasValidAdminSession = Boolean(validSession && validSession.role === 'admin');
  const pathAddress = extractAddressFromPath(pathname);

  if (hasValidAdminSession && pathAddress && validSession && normalizeAddress(validSession.address) !== pathAddress) {
    event.waitUntil(
      logSecurityEvent(request, {
        action: 'SECURITY_ADDRESS_MISMATCH',
        detail: 'Address in path does not match authenticated admin claim',
        adminAddress: validSession.address,
        metadata: {
          pathname,
          method: request.method,
          pathAddress,
          claimAddress: validSession.address,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      }),
    );

    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ error: 'Forbidden: address claim mismatch' }, { status: 403 });
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/admin';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!isAdminApiRouteAllowed(pathname, request.method)) {
      return NextResponse.json({ error: 'Forbidden: admin API policy denied' }, { status: 403 });
    }

    if (!hasValidAdminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = NextResponse.next();
    return token ? withSlidingCookie(response, token) : response;
  }

  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    if (!hasValidAdminSession) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }

    const moduleName = getAdminUiModule(pathname);
    if (moduleName && !ADMIN_UI_MODULES.has(moduleName)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }

    const response = NextResponse.next();
    return token ? withSlidingCookie(response, token) : response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
