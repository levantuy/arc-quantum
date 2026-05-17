import { NextRequest, NextResponse } from 'next/server';
import {
  buildAdminChallengeMessage,
  issueAdminNonce,
  normalizeAddress,
} from '@/lib/auth/admin-auth';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/security/rate-limit';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  const rateLimit = checkRateLimit(req, 'auth:nonce', {
    windowMs: 60 * 1000,
    maxRequests: 20,
  }, address.toLowerCase());

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfterSeconds);
  }

  const normalizedAddress = normalizeAddress(address);
  const user = await prisma.user.findUnique({
    where: { address: normalizedAddress },
    select: { id: true, isAdmin: true },
  });

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'address is not an admin' }, { status: 403 });
  }

  const { nonce, expiresAt } = await issueAdminNonce(normalizedAddress, user.id);
  const message = buildAdminChallengeMessage(nonce);

  return NextResponse.json({
    nonce,
    message,
    expiresAt: expiresAt.toISOString(),
  });
}
