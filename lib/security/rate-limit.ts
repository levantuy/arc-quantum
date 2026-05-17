import { NextRequest, NextResponse } from 'next/server';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

const store = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return 'unknown';
}

function cleanupExpiredEntries(now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
  request: NextRequest,
  bucket: string,
  config: RateLimitConfig,
  identityHint?: string,
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const ip = getClientIp(request);
  const identity = identityHint ? `${ip}:${identityHint}` : ip;
  const key = `${bucket}:${identity}`;

  cleanupExpiredEntries(now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
      remaining: config.maxRequests - 1,
    };
  }

  existing.count += 1;
  store.set(key, existing);

  const remainingWindowMs = Math.max(existing.resetAt - now, 0);
  const retryAfterSeconds = Math.ceil(remainingWindowMs / 1000);

  if (existing.count > config.maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds,
    remaining: Math.max(config.maxRequests - existing.count, 0),
  };
}

export function rateLimitExceededResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests. Please retry later.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfterSeconds.toString(),
      },
    },
  );
}
