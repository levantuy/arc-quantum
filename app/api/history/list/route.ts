import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function isDatabaseUnavailableError(error: unknown) {
  const prismaCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : null;

  if (prismaCode === 'P5010' || prismaCode === 'P1001' || prismaCode === 'P1002') {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error ?? '');

  return /cannot fetch data from service|fetch failed|can't reach database server|timed out/i.test(
    message
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const txType = searchParams.get('type');
  const limitParam = Number(searchParams.get('limit') ?? '10');
  const offsetParam = Number(searchParams.get('offset') ?? '0');
  
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

  if (!address) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  try {
    const normalizedAddress = normalizeAddress(address);
    
    // Get total count
    const total = await prisma.transaction.count({
      where: {
        from: normalizedAddress,
        ...(txType && txType !== 'all' ? { txType } : {}),
      },
    });

    const transactions = await prisma.transaction.findMany({
      where: {
        from: normalizedAddress,
        ...(txType && txType !== 'all' ? { txType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({
      data: {
        transactions: transactions.map((transaction) => ({
          id: Number(transaction.id),
          hash: transaction.hash,
          txType: transaction.txType,
          from: transaction.from,
          to: transaction.to,
          amount: transaction.amount,
          amountIn: transaction.amountIn,
          amountOut: transaction.amountOut,
          tokenIn: transaction.tokenIn,
          tokenOut: transaction.tokenOut,
          chainId: transaction.chainId,
          status: transaction.status,
          explorerUrl: transaction.explorerUrl,
          errorMessage: transaction.errorMessage,
          createdAt: transaction.createdAt.toISOString(),
          updatedAt: transaction.updatedAt.toISOString(),
        })),
        total,
      },
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        {
          error: 'Unable to connect to the history database right now. Please try again later.',
          data: {
            transactions: [],
            total: 0,
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'An error occurred while loading transaction history.',
        data: {
          transactions: [],
          total: 0,
        },
      },
      { status: 500 }
    );
  }
}
