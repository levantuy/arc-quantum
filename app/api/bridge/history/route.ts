// GET /api/bridge/history
// UC-BRIDGE-002: Get user's bridge transaction history
import { NextRequest, NextResponse } from 'next/server';
import { BridgeService } from '@/lib/bridge/service';
import { isAddress } from 'ethers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid or missing address parameter' },
        { status: 400 }
      );
    }

    const history = await BridgeService.getUserTransactionHistory(
      address as `0x${string}`,
      Math.max(Math.min(limit, 100), 1), // Max 100 and min 1 per request
      Math.max(offset, 0)
    );

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch history';
    console.error('[Bridge API] History error:', error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
