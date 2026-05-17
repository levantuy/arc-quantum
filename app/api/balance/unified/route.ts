// API route: Lấy unified balance từ Arc blockchain
import { NextRequest, NextResponse } from 'next/server';
import { arcProvider } from '@/lib/arc/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address || !address.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400 }
      );
    }

    // Query Arc RPC for balance
    const balanceWei = await arcProvider.getBalance(address);
    
    // Convert from Wei to ARC (assuming 18 decimals)
    const balanceArc = arcProvider.formatEther(balanceWei);

    return NextResponse.json({
      balance: parseFloat(balanceArc).toFixed(4),
      address,
      balanceWei: balanceWei.toString(),
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
