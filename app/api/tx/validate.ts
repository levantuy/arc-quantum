// API route: Validate TX trước khi ký
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // TODO: Validate TX params, return validation result
  return NextResponse.json({ valid: true });
}
