import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '../db/prisma';
import {
  ADMIN_SESSION_ROTATE_WINDOW_SECONDS,
  ADMIN_SESSION_TTL_SECONDS,
  signAdminSessionJwt,
  verifyAdminSessionJwt,
} from './admin-jwt';

export const ADMIN_SESSION_COOKIE = 'aq_admin_session';
const ADMIN_NONCE_TTL_MS = 10 * 60 * 1000;
const ADMIN_SESSION_TTL_MS = ADMIN_SESSION_TTL_SECONDS * 1000;
const ADMIN_SESSION_ROTATE_WINDOW_MS = ADMIN_SESSION_ROTATE_WINDOW_SECONDS * 1000;

export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function buildAdminChallengeMessage(nonce: string): string {
  return [
    'Arc Quantum Admin Login',
    `Nonce: ${nonce}`,
    'Purpose: Sign this message to authenticate as admin.',
  ].join('\n');
}

export function createNonceValue(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issueAdminNonce(
  address: string,
  userId?: bigint,
): Promise<{ nonce: string; expiresAt: Date }> {
  const normalizedAddress = normalizeAddress(address);
  const nonce = createNonceValue();
  const expiresAt = new Date(Date.now() + ADMIN_NONCE_TTL_MS);

  await prisma.adminNonce.create({
    data: {
      userId,
      address: normalizedAddress,
      nonce,
      expiresAt,
    },
  });

  return { nonce, expiresAt };
}

export async function createAdminSession(user: { id: bigint; address: string }): Promise<string> {
  const sessionToken = createSessionToken();
  const tokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);

  const session = await prisma.adminSession.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const jwt = await signAdminSessionJwt({
    sessionId: session.id.toString(),
    userId: user.id.toString(),
    address: user.address,
    role: 'admin',
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });

  return jwt;
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function revokeAdminSessionByToken(token: string): Promise<void> {
  const payload = await verifyAdminSessionJwt(token);
  if (!payload?.sessionId) {
    return;
  }

  const sessionId = BigInt(payload.sessionId);
  await prisma.adminSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function getAdminFromSessionCookie(): Promise<{ id: bigint; address: string; isAdmin: boolean } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAdminSessionJwt(token);
  if (!payload?.sessionId) {
    return null;
  }

  const sessionId = BigInt(payload.sessionId);
  const session = await prisma.adminSession.findFirst({
    where: {
      id: sessionId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { isAdmin: true },
    },
    include: {
      user: {
        select: {
          id: true,
          address: true,
          isAdmin: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const now = Date.now();
  if (session.expiresAt.getTime() - now <= ADMIN_SESSION_ROTATE_WINDOW_MS) {
    const nextExpiresAt = new Date(now + ADMIN_SESSION_TTL_MS);

    await prisma.adminSession.update({
      where: { id: session.id },
      data: { expiresAt: nextExpiresAt },
    });

    const refreshedJwt = await signAdminSessionJwt({
      sessionId: session.id.toString(),
      userId: session.user.id.toString(),
      address: session.user.address,
      role: 'admin',
      expiresAt: nextExpiresAt,
    });

    cookieStore.set(ADMIN_SESSION_COOKIE, refreshedJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: nextExpiresAt,
    });
  }

  return session.user;
}

export async function getAdminSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null;
}
