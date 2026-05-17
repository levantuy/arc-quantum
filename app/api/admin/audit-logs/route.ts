import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrUnauthorized } from '@/lib/auth/admin-api';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const { admin, unauthorizedResponse } = await requireAdminOrUnauthorized();
  if (!admin) {
    return unauthorizedResponse;
  }

  const action = req.nextUrl.searchParams.get('action');
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const where = {
    action: action || undefined,
    createdAt:
      from || to
        ? {
            gte: from ? new Date(from) : undefined,
            lte: to ? new Date(to) : undefined,
          }
        : undefined,
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({
    logs: logs.map((log: typeof logs[number]) => ({
      ...log,
      id: log.id.toString(),
      adminId: log.adminId?.toString() ?? null,
    })),
  });
}
