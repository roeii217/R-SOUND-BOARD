import { NextRequest, NextResponse } from 'next/server';
import { broadcastToRoom } from '@/lib/realtime/relay-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, type, payload, senderId } = body;

    if (!roomId || !type) {
      return NextResponse.json({ error: 'Missing roomId or type' }, { status: 400 });
    }

    const deliveredCount = broadcastToRoom(roomId, {
      type,
      payload,
      senderId,
    });

    return NextResponse.json({ success: true, deliveredCount });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
