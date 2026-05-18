// GET /api/bridge/history
// UC-BRIDGE-002 / UC-HIS-001: Get user's bridge transaction history
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { isAddress } from 'ethers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const hash = searchParams.get('hash');
    const limit = Math.max(Math.min(parseInt(searchParams.get('limit') || '10', 10), 100), 1);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid or missing address parameter' },
        { status: 400 }
      );
    }

    const where = {
      userAddress: { equals: address, mode: 'insensitive' as const },
      ...(status ? { status } : {}),
      ...(hash
        ? {
            OR: [
              { txHashSource: { contains: hash, mode: 'insensitive' as const } },
              { txHashDest: { contains: hash, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...((dateFrom || dateTo)
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [total, transactions] = await Promise.all([
      prisma.bridgeTransaction.count({ where }),
      prisma.bridgeTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map((tx) => ({
          id: Number(tx.id),
          userAddress: tx.userAddress,
          fromChainId: tx.fromChainId,
          toChainId: tx.toChainId,
          tokenAddress: tx.tokenAddress,
          amount: tx.amount,
          status: tx.status,
          txHashSource: tx.txHashSource,
          txHashDest: tx.txHashDest,
          errorMessage: tx.errorMessage,
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
        })),
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch history';
    console.error('[Bridge API] History error:', error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
