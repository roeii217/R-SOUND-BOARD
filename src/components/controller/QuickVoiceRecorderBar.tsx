'use client';

import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Plus, Upload } from 'lucide-react';
import { uploadSoundAudio } from '../../lib/storage/sound-storage';
import { Sound } from '../../lib/types/soundboard';

interface QuickVoiceRecorderBarProps {
  roomId: string;
  soundsCount: number;
  onAddSound: (sound: Sound) => void;
  onOpenUploadModal: () => void;
}

export function QuickVoiceRecorderBar({
  roomId,
  soundsCount,
  onAddSound,
  onOpenUploadModal,
}: QuickVoiceRecorderBarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('Microphone requires HTTPS. Please open via the secure link.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        await saveRecording(audioBlob);
      };

      rec.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone error:', err);
      setErrorMsg('Microphone blocked. Please allow mic in browser settings.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveRecording = async (blob: Blob) => {
    setIsSaving(true);
    try {
      const soundId = `rec-${Date.now()}`;
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
      const audioUrl = await uploadSoundAudio(roomId, soundId, blob, `recording.${ext}`);

      const newSound: Sound = {
        id: soundId,
        roomId,
        categoryId: 'cat-reactions',
        name: `🎙️ Voice Note ${soundsCount + 1}`,
        audioUrl,
        duration: recordSeconds || 2.0,
        color: '#ec4899',
        orderIndex: soundsCount + 1,
        volume: 1.0,
      };

      onAddSound(newSound);
    } catch (err) {
      console.error('Save recording error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save recording.');
    } finally {
      setIsSaving(false);
      setRecordSeconds(0);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 select-none">
      {errorMsg && (
        <div className="text-center text-xs text-red-400 bg-red-950/60 border border-red-900/60 rounded-xl py-1.5 px-3 mb-2 shadow">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2 shadow-2xl backdrop-blur-md">
        {/* Quick Record Button */}
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 animate-pulse transition-all shadow-lg"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop &amp; Add to Board ({recordSeconds}s)</span>
          </button>
        ) : isSaving ? (
          <div className="flex-1 h-12 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span>Uploading to PC...</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="flex-1 h-12 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 text-zinc-100 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all border border-zinc-700/60 shadow-sm"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <Mic className="w-4 h-4 text-red-400" />
            <span>Record Voice to Board</span>
          </button>
        )}

        {/* Upload Audio / Video File Button */}
        <button
          type="button"
          onClick={onOpenUploadModal}
          className="h-12 px-3.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 flex items-center justify-center gap-1.5 text-xs font-medium transition-all shrink-0"
          title="Upload Audio or Video from Gallery"
        >
          <Upload className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>
    </div>
  );
}
