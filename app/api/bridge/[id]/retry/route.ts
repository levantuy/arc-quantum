// POST /api/bridge/[id]/retry
// UC-BRIDGE-003: Disabled server-side retry - bridge is executed on frontend via App Kit
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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

    return NextResponse.json(
      {
        success: false,
        error:
          'Server-side retry is disabled. Please re-initiate bridge from frontend using Arc App Kit.',
      },
      { status: 409 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retry transaction';
    console.error('[Bridge API] Retry error:', error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
