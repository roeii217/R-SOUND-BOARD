import { getSupabase, isSupabaseConfigured } from '../supabase/client';

const DB_NAME = 'EchoBoardStorage';
const STORE_NAME = 'audio_blobs';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBlobToIndexedDB(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save blob to IndexedDB:', err);
  }
}

export async function getBlobFromIndexedDB(key: string): Promise<Blob | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Uploads an audio blob to Server or Supabase Storage so ALL connected devices can access it!
 */
export async function uploadSoundAudio(
  roomId: string,
  soundId: string,
  blob: Blob,
  fileName: string = 'sound.wav'
): Promise<string> {
  // 1. If Supabase is configured, upload to cloud storage bucket
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const ext = fileName.split('.').pop() || 'wav';
        const path = `${roomId}/${soundId}.${ext}`;
        
        const { data, error } = await supabase.storage
          .from('soundboard-audio')
          .upload(path, blob, {
            contentType: blob.type || 'audio/wav',
            upsert: true,
          });

        if (!error && data) {
          const { data: pubData } = supabase.storage
            .from('soundboard-audio')
            .getPublicUrl(path);

          if (pubData && pubData.publicUrl) {
            return pubData.publicUrl;
          }
        }
      } catch (err) {
        console.warn('Supabase storage upload error:', err);
      }
    }
  }

  // 2. Upload to Server Storage endpoint via FormData
  try {
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('roomId', roomId);
    formData.append('soundId', soundId);

    const res = await fetch('/api/sounds/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioUrl) {
        await saveBlobToIndexedDB(`sound_${roomId}_${soundId}`, blob);
        return data.audioUrl;
      }
    }
  } catch (err) {
    console.warn('Server sound upload via FormData failed, attempting Base64 fallback:', err);
  }

  // 3. Robust Base64 JSON fallback for mobile Safari / proxies
  try {
    const base64Data = await blobToBase64(blob);
    const res = await fetch('/api/sounds/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        soundId,
        fileName,
        fileBase64: base64Data,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioUrl) {
        await saveBlobToIndexedDB(`sound_${roomId}_${soundId}`, blob);
        return data.audioUrl;
      }
    }
  } catch (err) {
    console.error('Base64 upload failed:', err);
  }

  throw new Error('Could not upload sound to server. Please check your network connection.');
}

/**
 * Converts a Blob to a base64 Data URL (used for JSON exports)
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts a Data URL or URL to a Blob
 */
export async function urlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  return await response.blob();
}
