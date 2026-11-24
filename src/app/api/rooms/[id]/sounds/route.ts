import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDefaultSounds, DEFAULT_CATEGORIES } from '@/lib/presets/default-sounds';
import { broadcastToRoom } from '@/lib/realtime/relay-store';
import { Sound } from '@/lib/types/soundboard';

export const dynamic = 'force-dynamic';

function getRoomStorageDir(): string {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'rooms');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getRoomCustomSounds(roomId: string): Sound[] {
  try {
    const dir = getRoomStorageDir();
    const filePath = path.join(dir, `${roomId.toUpperCase()}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn(`Error reading room custom sounds for ${roomId}:`, err);
  }
  return [];
}

function saveRoomCustomSounds(roomId: string, sounds: Sound[]): void {
  try {
    const dir = getRoomStorageDir();
    const filePath = path.join(dir, `${roomId.toUpperCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sounds, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`Error writing room custom sounds for ${roomId}:`, err);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const roomId = (params.id || 'ECHO-DEFAULT').toUpperCase();
  const defaults = await getDefaultSounds(roomId);
  const customSounds = getRoomCustomSounds(roomId);

  // Merge: custom sounds override or append
  const defaultIds = new Set(defaults.map((s) => s.id));
  const uniqueCustom = customSounds.filter((s) => !defaultIds.has(s.id));
  const allSounds = [...defaults, ...uniqueCustom];

  return NextResponse.json({
    roomId,
    sounds: allSounds,
    categories: DEFAULT_CATEGORIES,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = (params.id || 'ECHO-DEFAULT').toUpperCase();
    const body = await req.json();
    const newSound = body.sound as Sound;

    if (!newSound || !newSound.id || !newSound.audioUrl) {
      return NextResponse.json({ error: 'Invalid sound object' }, { status: 400 });
    }

    // Load existing custom sounds
    const customSounds = getRoomCustomSounds(roomId);
    const existingIndex = customSounds.findIndex((s) => s.id === newSound.id);
    if (existingIndex >= 0) {
      customSounds[existingIndex] = newSound;
    } else {
      customSounds.push(newSound);
    }
    saveRoomCustomSounds(roomId, customSounds);

    // Get merged list
    const defaults = await getDefaultSounds(roomId);
    const defaultIds = new Set(defaults.map((s) => s.id));
    const allSounds = [...defaults, ...customSounds.filter((s) => !defaultIds.has(s.id))];

    // Broadcast sync to all connected devices in this room!
    broadcastToRoom(roomId, {
      type: 'soundboard:sync',
      payload: {
        sounds: allSounds,
        categories: DEFAULT_CATEGORIES,
      },
    });

    return NextResponse.json({
      success: true,
      sounds: allSounds,
    });
  } catch (err: unknown) {
    console.error('Save room sound error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = (params.id || 'ECHO-DEFAULT').toUpperCase();
    const body = await req.json();
    const soundId = body.soundId as string;

    if (!soundId) {
      return NextResponse.json({ error: 'Missing soundId' }, { status: 400 });
    }

    const customSounds = getRoomCustomSounds(roomId).filter((s) => s.id !== soundId);
    saveRoomCustomSounds(roomId, customSounds);

    const defaults = await getDefaultSounds(roomId);
    const defaultIds = new Set(defaults.map((s) => s.id));
    const allSounds = [...defaults, ...customSounds.filter((s) => !defaultIds.has(s.id))];

    broadcastToRoom(roomId, {
      type: 'soundboard:sync',
      payload: {
        sounds: allSounds,
        categories: DEFAULT_CATEGORIES,
      },
    });

    return NextResponse.json({
      success: true,
      sounds: allSounds,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
