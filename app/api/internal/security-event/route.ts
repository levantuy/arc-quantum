import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/auth/audit-log';

type SecurityEventBody = {
  action?: string;
  detail?: string;
  adminAddress?: string;
  metadata?: unknown;
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

export async function POST(req: NextRequest) {
  const providedSecret = req.headers.get('x-internal-audit-secret');
  if (!providedSecret || providedSecret !== getInternalAuditSecret()) {
    return NextResponse.json({ error: 'Unauthorized internal event' }, { status: 401 });
  }

  const body = (await req.json()) as SecurityEventBody;
  const action = body.action || 'SECURITY_EVENT';
  const adminAddress = body.adminAddress || 'unknown';

  await writeAuditLog({
    action,
    adminAddress,
    detail: body.detail,
    newData: body.metadata,
  });

  return NextResponse.json({ success: true });
}
