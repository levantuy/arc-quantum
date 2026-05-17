// API route: Ghi nhận TX sau khi ký
import { NextRequest, NextResponse } from 'next/server';
import { arcProvider } from '@/lib/arc/client';

interface ConfirmPayload {
  signedTx: string; // Signed transaction hex
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConfirmPayload;

    if (!body.signedTx) {
      return NextResponse.json(
        { error: 'Signed transaction is required', success: false },
        { status: 400 }
      );
    }

    // Broadcast the signed transaction to the Arc network
    const txResponse = await arcProvider.broadcastTransaction(body.signedTx);
    const txHash = txResponse.hash;

    return NextResponse.json({
      success: true,
      hash: txHash,
      message: 'Transaction submitted to the network',
    });
  } catch (error: any) {
    console.error('Transaction broadcast error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to broadcast transaction',
        success: false,
      },
      { status: 500 }
    );
  }
}
