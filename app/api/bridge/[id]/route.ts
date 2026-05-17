// GET /api/bridge/[id]
// UC-BRIDGE-002: Get transaction status with audit logs
import { NextRequest, NextResponse } from 'next/server';
import { BridgeService } from '@/lib/bridge/service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    const transaction = await BridgeService.getTransactionWithLogs(id);

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transaction not found';
    console.error('[Bridge API] Get transaction error:', error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    );
  }
}
