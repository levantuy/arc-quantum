import { jwtVerify, SignJWT } from 'jose';

type AdminSessionClaims = {
  sessionId: string;
  userId: string;
  address: string;
  role: 'admin';
  expiresAt: Date;
};

const ISSUER = 'arc-quantum-admin';
const AUDIENCE = 'arc-quantum-admin-ui';
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
export const ADMIN_SESSION_ROTATE_WINDOW_SECONDS = 20 * 60;

function getAdminJwtSecret(): Uint8Array {
  const configuredSecret = process.env.ADMIN_JWT_SECRET;

  if (configuredSecret) {
    return new TextEncoder().encode(configuredSecret);
  }

  if (process.env.NODE_ENV !== 'production') {
    return new TextEncoder().encode('dev-only-admin-jwt-secret-change-in-prod');
  }

  throw new Error('ADMIN_JWT_SECRET is required in production');
}

export async function signAdminSessionJwt(claims: AdminSessionClaims): Promise<string> {
  const secret = getAdminJwtSecret();

  return new SignJWT({
    sid: claims.sessionId,
    addr: claims.address,
    role: 'admin',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(claims.expiresAt.getTime() / 1000))
    .sign(secret);
}

export async function verifyAdminSessionJwt(token: string): Promise<AdminSessionClaims | null> {
  try {
    const secret = getAdminJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const sessionId = typeof payload.sid === 'string' ? payload.sid : null;
    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    const address = typeof payload.addr === 'string' ? payload.addr : null;
    const role = payload.role;
    const exp = typeof payload.exp === 'number' ? payload.exp : null;

    if (!sessionId || !userId || !address || role !== 'admin' || !exp) {
      return null;
    }

    return {
      sessionId,
      userId,
      address,
      role: 'admin',
      expiresAt: new Date(exp * 1000),
    };
  } catch {
    return null;
  }
}

export function shouldRotateAdminSession(claims: AdminSessionClaims, now = new Date()): boolean {
  const rotateThresholdMs = ADMIN_SESSION_ROTATE_WINDOW_SECONDS * 1000;
  return claims.expiresAt.getTime() - now.getTime() <= rotateThresholdMs;
}
