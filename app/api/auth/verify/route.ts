import { NextRequest, NextResponse } from 'next/server';
import { getAddress, verifyMessage } from 'ethers';
import {
  buildAdminChallengeMessage,
  createAdminSession,
  normalizeAddress,
} from '@/lib/auth/admin-auth';
import { writeAuditLog } from '@/lib/auth/audit-log';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/security/rate-limit';

type VerifyBody = {
  address?: string;
  signature?: string;
  nonce?: string;
};

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, 'auth:verify', {
    windowMs: 60 * 1000,
    maxRequests: 12,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfterSeconds);
  }

  const body = (await req.json()) as VerifyBody;
  const address = body.address;
  const signature = body.signature;
  const nonce = body.nonce;

  if (!address || !signature || !nonce) {
    return NextResponse.json(
      { error: 'address, signature and nonce are required' },
      { status: 400 },
    );
  }

  const normalizedAddress = normalizeAddress(address);

  const nonceRecord = await prisma.adminNonce.findFirst({
    where: {
      address: normalizedAddress,
      nonce,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!nonceRecord) {
    await writeAuditLog({
      action: 'ADMIN_LOGIN_FAILED',
      adminAddress: normalizedAddress,
      detail: 'Invalid or expired nonce',
    });

    return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 });
  }

  const message = buildAdminChallengeMessage(nonce);

  let recoveredAddress: string;
  try {
    recoveredAddress = normalizeAddress(getAddress(verifyMessage(message, signature)));
  } catch {
    await writeAuditLog({
      action: 'ADMIN_LOGIN_FAILED',
      adminAddress: normalizedAddress,
      detail: 'Signature verification error',
    });

    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (recoveredAddress !== normalizedAddress) {
    await writeAuditLog({
      action: 'ADMIN_LOGIN_FAILED',
      adminAddress: normalizedAddress,
      detail: 'Recovered address mismatch',
    });

    return NextResponse.json({ error: 'Signature does not match address' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { address: normalizedAddress },
    select: { id: true, isAdmin: true, address: true },
  });

  if (!user || !user.isAdmin) {
    await writeAuditLog({
      action: 'ADMIN_LOGIN_FAILED',
      adminAddress: normalizedAddress,
      detail: 'Address does not have admin role',
    });

    return NextResponse.json({ error: 'Address is not an admin' }, { status: 403 });
  }

  await prisma.adminNonce.update({
    where: { id: nonceRecord.id },
    data: { usedAt: new Date() },
  });

  await createAdminSession({ id: user.id, address: user.address });

  await writeAuditLog({
    action: 'ADMIN_LOGIN_SUCCESS',
    adminId: user.id,
    adminAddress: user.address,
    detail: 'Admin signed in with wallet signature',
  });

  return NextResponse.json({ success: true, address: user.address });
}
