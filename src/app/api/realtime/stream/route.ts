import { NextRequest } from 'next/server';
import { addRoomSubscriber, removeRoomSubscriber, broadcastToRoom } from '@/lib/realtime/relay-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId') || 'default';
  const deviceId = searchParams.get('deviceId') || `dev-${Math.random().toString(36).substring(2, 8)}`;

  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      addRoomSubscriber(roomId, deviceId, controller);

      // Send initial connection ACK
      const initMsg = `data: ${JSON.stringify({ type: 'connected', deviceId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initMsg));

      // Broadcast join event to other devices in this room
      broadcastToRoom(roomId, {
        type: 'presence:join',
        payload: { id: deviceId },
        senderId: deviceId,
      });

      // Heartbeat every 10 seconds to keep connection alive on iOS Safari & Android Chrome
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
        } catch {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 10000);
    },
    cancel() {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      removeRoomSubscriber(roomId, deviceId);
      broadcastToRoom(roomId, {
        type: 'presence:leave',
        payload: deviceId,
        senderId: deviceId,
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
