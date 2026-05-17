import { prisma } from '../db/prisma';

export async function writeAuditLog(input: {
  action: string;
  adminId?: bigint;
  adminAddress: string;
  detail?: string;
  oldData?: unknown;
  newData?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      adminId: input.adminId,
      adminAddress: input.adminAddress,
      detail: input.detail,
      oldData: input.oldData ? JSON.stringify(input.oldData) : null,
      newData: input.newData ? JSON.stringify(input.newData) : null,
    },
  });
}
