import { audioBufferToWavBlob } from '../utils/sound-generator';

export interface ExtractedAudioResult {
  audioBlob: Blob;
  duration: number;
  fileName: string;
  sourceType: 'audio' | 'video';
}

export type ExtractionProgressCallback = (percent: number, statusText: string) => void;

/**
 * Checks if a given file is a video file supported for extraction.
 */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['mp4', 'mov', 'webm', 'm4v', '3gp', 'mkv'].includes(ext || '');
}

/**
 * Client-Side Video-to-Audio Extractor.
 * Extracts the audio track from videos directly in the browser (iOS Safari, Android Chrome, Desktop)
 * using the Web Audio API without needing any server-side ffmpeg or manual conversion!
 */
export async function extractAudioFromMediaFile(
  file: File,
  onProgress?: ExtractionProgressCallback
): Promise<ExtractedAudioResult> {
  const isVideo = isVideoFile(file);
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  // If it's already an audio file, wrap it and determine duration
  if (!isVideo) {
    onProgress?.(50, 'Analyzing audio format...');
    let duration = 0;
    try {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;
      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => {
          duration = audio.duration;
          resolve();
        };
        audio.onerror = () => resolve();
      });
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback
    }

    onProgress?.(100, 'Audio ready!');
    return {
      audioBlob: file,
      duration: duration || 1.0,
      fileName: baseName,
      sourceType: 'audio',
    };
  }

  // --- VIDEO AUDIO EXTRACTION PIPELINE ---
  onProgress?.(10, 'Reading video data into memory...');

  // Step 1: Read video file to ArrayBuffer with progress
  const arrayBuffer = await readFileAsArrayBuffer(file, (pct) => {
    onProgress?.(10 + Math.round(pct * 0.4), `Loading video: ${Math.round(pct)}%`);
  });

  onProgress?.(55, 'Demuxing audio track via Web Audio API...');

  // Step 2: Use AudioContext to decode audio data from video container
  let audioBuffer: AudioBuffer | null = null;
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const tempCtx = new AudioCtxClass();

  try {
    audioBuffer = await decodeAudioDataSafe(tempCtx, arrayBuffer);
  } catch (decodeErr) {
    console.warn('Direct decodeAudioData failed, attempting media element fallback:', decodeErr);
    onProgress?.(65, 'Using alternate browser decoder...');
    audioBuffer = await extractViaVideoElement(file, onProgress);
  } finally {
    tempCtx.close().catch(() => {});
  }

  if (!audioBuffer) {
    throw new Error('Could not extract audio track from this video file. Ensure the video contains audio.');
  }

  onProgress?.(85, 'Encoding clean WAV audio track...');

  // Step 3: Convert AudioBuffer to standard 16-bit PCM WAV Blob
  const wavBlob = audioBufferToWavBlob(audioBuffer);
  const duration = audioBuffer.duration;

  onProgress?.(100, 'Audio extraction complete!');

  return {
    audioBlob: wavBlob,
    duration,
    fileName: baseName,
    sourceType: 'video',
  };
}

/**
 * Safely decodes audio data handling both Promise and callback-based APIs (iOS Safari legacy).
 */
function decodeAudioDataSafe(ctx: AudioContext, buffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    // ArrayBuffer is transferred/detached upon decodeAudioData in some engines, make a slice
    const copy = buffer.slice(0);
    const result = ctx.decodeAudioData(
      copy,
      (decoded) => resolve(decoded),
      (err) => reject(err)
    );
    if (result && typeof result.then === 'function') {
      result.then(resolve).catch(reject);
    }
  });
}

/**
 * Reads File as ArrayBuffer with progress reporting
 */
function readFileAsArrayBuffer(file: File, onProgress?: (pct: number) => void): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    };

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Fallback audio extraction using HTMLVideoElement and MediaStream destination
 */
async function extractViaVideoElement(
  file: File,
  onProgress?: ExtractionProgressCallback
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = false;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (!duration || !isFinite(duration)) {
          URL.revokeObjectURL(url);
          reject(new Error('Invalid video duration.'));
          return;
        }

        onProgress?.(70, 'Buffering video audio...');
        // Offline rendering via captureStream or MediaElementSource
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtxClass();
        const source = ctx.createMediaElementSource(video);
        const destination = ctx.createMediaStreamDestination();
        source.connect(destination);

        const recorder = new MediaRecorder(destination.stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          URL.revokeObjectURL(url);
          ctx.close().catch(() => {});
          const fullBlob = new Blob(chunks, { type: recorder.mimeType });
          const ab = await fullBlob.arrayBuffer();
          const decodeCtx = new AudioCtxClass();
          const finalBuffer = await decodeAudioDataSafe(decodeCtx, ab);
          decodeCtx.close().catch(() => {});
          resolve(finalBuffer);
        };

        video.playbackRate = 2.0; // Speed up capture if supported
        recorder.start(100);
        await video.play();

        video.onended = () => {
          recorder.stop();
        };
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Video format could not be played in browser.'));
    };
  });
}
