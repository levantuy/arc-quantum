// API route: Lấy unified balance
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO: Query Arc RPC, aggregate balances
  return NextResponse.json({ balances: [] });
}
