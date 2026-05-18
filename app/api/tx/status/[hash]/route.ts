import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { arcProvider } from '@/lib/arc/client';

function isHexHash(value: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

type RouteContext = {
  params: Promise<{ hash: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { hash } = await context.params;

  if (!isHexHash(hash)) {
    return NextResponse.json({ error: 'Invalid transaction hash' }, { status: 400 });
  }

  const existing = await prisma.transaction.findUnique({ where: { hash } });
  const receipt = await arcProvider.getTransactionReceipt(hash).catch(() => null);

  const nextStatus = !receipt ? existing?.status ?? 'pending' : receipt.status === 1 ? 'success' : 'failed';
  const errorMessage = receipt && receipt.status !== 1 ? 'Transaction reverted on chain.' : existing?.errorMessage ?? null;
  const now = receipt ? new Date() : null;

  if (existing && (existing.status !== nextStatus || existing.errorMessage !== errorMessage)) {
    await prisma.transaction.update({
      where: { hash },
      data: {
        status: nextStatus,
        errorMessage,
        ...(now && !existing.confirmedAt ? { confirmedAt: now } : {}),
      },
    });
  }

  const confirmedAt = existing?.confirmedAt ?? now;

  return NextResponse.json({
    hash,
    status: nextStatus,
    explorerUrl: existing?.explorerUrl ?? null,
    chainId: existing?.chainId ?? null,
    blockNumber: receipt ? receipt.blockNumber.toString() : null,
    confirmedAt: confirmedAt ? confirmedAt.toISOString() : null,
    errorMessage,
  });
}
