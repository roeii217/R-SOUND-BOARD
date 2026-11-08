// In-memory room subscriber store for local / zero-config realtime synchronization
type ClientController = ReadableStreamDefaultController<Uint8Array>;

// Global registry shared across API requests in Node.js runtime
const globalStore = global as unknown as {
  __echoboard_rooms__?: Map<string, Map<string, ClientController>>;
};

if (!globalStore.__echoboard_rooms__) {
  globalStore.__echoboard_rooms__ = new Map();
}

const rooms = globalStore.__echoboard_rooms__;

export function addRoomSubscriber(roomId: string, deviceId: string, controller: ClientController): void {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  rooms.get(roomId)!.set(deviceId, controller);
}

export function removeRoomSubscriber(roomId: string, deviceId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(deviceId);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }
}

export function broadcastToRoom(
  roomId: string,
  event: { type: string; payload: unknown; senderId?: string }
): number {
  const room = rooms.get(roomId);
  if (!room) return 0;

  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  let sentCount = 0;

  room.forEach((controller, deviceId) => {
    // Don't echo back to the sender
    if (event.senderId && deviceId === event.senderId) return;

    try {
      controller.enqueue(encoded);
      sentCount++;
    } catch {
      // Stream closed, clean up
      room.delete(deviceId);
    }
  });

  return sentCount;
}

export function getRoomDeviceIds(roomId: string): string[] {
  const room = rooms.get(roomId);
  return room ? Array.from(room.keys()) : [];
}
