import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const roomId = (formData.get('roomId') as string) || 'general';
    const soundId = (formData.get('soundId') as string) || `sound-${Date.now()}`;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop() || 'wav';
    const cleanFileName = `${roomId}_${soundId}.${ext}`.replace(/[^a-zA-Z0-9_.-]/g, '_');

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, cleanFileName);
    fs.writeFileSync(filePath, buffer);

    const audioUrl = `/uploads/${cleanFileName}`;
    return NextResponse.json({ success: true, audioUrl, fileName: cleanFileName });
  } catch (err: unknown) {
    console.error('Sound upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
