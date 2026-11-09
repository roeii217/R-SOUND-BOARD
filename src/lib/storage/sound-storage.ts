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
      } else {
        console.warn('Supabase storage upload error:', error);
      }
    }
  }

  // 2. Upload to Server Storage endpoint so both Phone and PC have the exact same accessible URL
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
    console.warn('Server sound upload failed, using local fallback:', err);
  }

  // 3. Fallback for offline mode: Store locally in IndexedDB
  await saveBlobToIndexedDB(`sound_${roomId}_${soundId}`, blob);
  return URL.createObjectURL(blob);
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
