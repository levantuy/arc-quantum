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
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;

  if (!address) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  try {
    const normalizedAddress = normalizeAddress(address);
    const transactions = await prisma.transaction.findMany({
      where: {
        from: normalizedAddress,
        ...(txType && txType !== 'all' ? { txType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      history: transactions.map((transaction) => ({
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
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        {
          error: 'Khong the ket noi co so du lieu lich su luc nay. Vui long thu lai sau.',
          history: [],
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Da co loi xay ra khi tai lich su giao dich.',
        history: [],
      },
      { status: 500 }
    );
  }
}
