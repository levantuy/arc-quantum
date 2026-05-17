// API route: Lấy lịch sử giao dịch
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO: Query DB for user's TX history
  return NextResponse.json({ history: [] });
}
