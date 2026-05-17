// API route: Ghi nhận TX sau khi ký
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // TODO: Parse signed TX, save to DB
  return NextResponse.json({ success: true });
}
