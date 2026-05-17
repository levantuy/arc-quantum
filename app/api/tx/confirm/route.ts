import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ARC_TESTNET_CHAIN_ID } from '@/constants';

type ConfirmPayload = {
  hash?: string;
  txType?: string;
  from?: string;
  to?: string;
  amount?: string;
  amountIn?: string;
  amountOut?: string;
  tokenIn?: string;
  tokenOut?: string;
  chainId?: number;
  explorerUrl?: string;
  errorMessage?: string | null;
};

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function isHexHash(value: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ConfirmPayload;

  if (!body.hash || !isHexHash(body.hash)) {
    return NextResponse.json({ error: 'Valid transaction hash is required' }, { status: 400 });
  }

  if (!body.from || !body.to) {
    return NextResponse.json({ error: 'From and to addresses are required' }, { status: 400 });
  }

  const from = normalizeAddress(body.from);
  const to = normalizeAddress(body.to);
  const user = await prisma.user.upsert({
    where: { address: from },
    update: {},
    create: { address: from },
  });

  const transaction = await prisma.transaction.upsert({
    where: { hash: body.hash },
    update: {
      txType: body.txType ?? 'swap',
      from,
      to,
      amount: body.amount ?? body.amountIn ?? '0',
      amountIn: body.amountIn ?? body.amount ?? null,
      amountOut: body.amountOut ?? null,
      tokenIn: body.tokenIn ?? null,
      tokenOut: body.tokenOut ?? null,
      chainId: body.chainId ?? ARC_TESTNET_CHAIN_ID,
      status: 'confirming',
      explorerUrl: body.explorerUrl ?? null,
      errorMessage: body.errorMessage ?? null,
      userId: user.id,
    },
    create: {
      hash: body.hash,
      txType: body.txType ?? 'swap',
      from,
      to,
      amount: body.amount ?? body.amountIn ?? '0',
      amountIn: body.amountIn ?? body.amount ?? null,
      amountOut: body.amountOut ?? null,
      tokenIn: body.tokenIn ?? null,
      tokenOut: body.tokenOut ?? null,
      chainId: body.chainId ?? ARC_TESTNET_CHAIN_ID,
      status: 'confirming',
      explorerUrl: body.explorerUrl ?? null,
      errorMessage: body.errorMessage ?? null,
      userId: user.id,
    },
  });

  return NextResponse.json({
    transaction: {
      id: Number(transaction.id),
      hash: transaction.hash,
      status: transaction.status,
      explorerUrl: transaction.explorerUrl,
      createdAt: transaction.createdAt.toISOString(),
    },
  });
}
