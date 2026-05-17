import { NextRequest, NextResponse } from 'next/server';
import {
  clearAdminSessionCookie,
  getAdminSessionToken,
  getAdminFromSessionCookie,
  revokeAdminSessionByToken,
} from '@/lib/auth/admin-auth';
import { writeAuditLog } from '@/lib/auth/audit-log';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, 'auth:logout', {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfterSeconds);
  }

  const admin = await getAdminFromSessionCookie();
  const token = await getAdminSessionToken();

  if (token) {
    await revokeAdminSessionByToken(token);
  }

  if (admin) {
    await writeAuditLog({
      action: 'ADMIN_LOGOUT',
      adminId: admin.id,
      adminAddress: admin.address,
      detail: 'Admin logged out',
    });
  }

  await clearAdminSessionCookie();

  return NextResponse.json({ success: true });
}
