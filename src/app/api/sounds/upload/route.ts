import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let buffer: Buffer;
    let fileName: string = 'sound.wav';
    let roomId: string = 'general';
    let soundId: string = `sound-${Date.now()}`;

    if (contentType.includes('application/json')) {
      // Base64 JSON fallback upload
      const body = await req.json();
      roomId = (body.roomId as string) || 'general';
      soundId = (body.soundId as string) || `sound-${Date.now()}`;
      fileName = (body.fileName as string) || 'sound.wav';
      const base64Data = (body.fileBase64 as string) || '';

      if (!base64Data) {
        return NextResponse.json({ error: 'No base64 data provided' }, { status: 400 });
      }

      // Remove data URL prefix if present
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(cleanBase64, 'base64');
    } else {
      // Standard multipart/form-data upload
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      roomId = (formData.get('roomId') as string) || 'general';
      soundId = (formData.get('soundId') as string) || `sound-${Date.now()}`;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      fileName = file.name || 'sound.wav';
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    }

    const ext = fileName.split('.').pop() || 'wav';
    const cleanFileName = `${roomId}_${soundId}.${ext}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = path.join(uploadsDir, cleanFileName);
    fs.writeFileSync(filePath, buffer);

    const audioUrl = `/api/sounds/file/${cleanFileName}`;
    return NextResponse.json({ success: true, audioUrl, fileName: cleanFileName });
  } catch (err: unknown) {
    console.error('Sound upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
