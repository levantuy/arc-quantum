import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getAdminFromSessionCookie } from '@/lib/auth/admin-auth';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/security/rate-limit';

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, 'auth:session', {
    windowMs: 60 * 1000,
    maxRequests: 90,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfterSeconds);
  }

  const admin = await getAdminFromSessionCookie();

  return NextResponse.json({
    authenticated: Boolean(admin),
    admin: admin ? { address: admin.address, isAdmin: admin.isAdmin } : null,
  });
}
