// POST /api/bridge/transfer
// UC-BRIDGE-001: Persist bridge transfer history generated on frontend
import { NextRequest, NextResponse } from 'next/server';
import { BridgeService } from '@/lib/bridge/service';
import { BridgeHistoryRecordRequest } from '@/types';
import { isAddress } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const recordReq: BridgeHistoryRecordRequest = {
      userAddress: body.userAddress,
      fromChainId: Number(body.fromChainId),
      toChainId: Number(body.toChainId),
      tokenAddress: body.tokenAddress,
      amount: String(body.amount ?? ''),
      status: body.status,
      txHashSource: body.txHashSource ?? null,
      txHashDest: body.txHashDest ?? null,
      errorMessage: body.errorMessage ?? null,
      metadata: body.metadata ?? null,
    };

    if (!isAddress(recordReq.userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid userAddress' },
        { status: 400 }
      );
    }

    if (!isAddress(recordReq.tokenAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tokenAddress' },
        { status: 400 }
      );
    }

    if (
      !['pending', 'success', 'failed'].includes(recordReq.status) ||
      !Number.isInteger(recordReq.fromChainId) ||
      !Number.isInteger(recordReq.toChainId) ||
      recordReq.fromChainId <= 0 ||
      recordReq.toChainId <= 0 ||
      recordReq.fromChainId === recordReq.toChainId
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid bridge payload' },
        { status: 400 }
      );
    }

    if (Number(recordReq.amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const transaction = await BridgeService.createHistoryRecord(recordReq);

    return NextResponse.json(
      {
        success: true,
        data: transaction,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bridge history persistence failed';
    console.error('[Bridge API] Transfer error:', error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
