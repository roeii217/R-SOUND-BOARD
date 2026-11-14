'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Sound, Category } from '../../lib/types/soundboard';
import { uploadSoundAudio } from '../../lib/storage/sound-storage';
import { extractAudioFromMediaFile } from '../../lib/audio/video-extractor';
import { Upload, Mic, Square, Play, Loader2, Check } from 'lucide-react';

interface AddSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  categories: Category[];
  soundsCount: number;
  onAddSound: (sound: Sound) => void;
}

export function AddSoundModal({
  isOpen,
  onClose,
  roomId,
  categories,
  soundsCount,
  onAddSound,
}: AddSoundModalProps) {
  const [mode, setMode] = useState<'upload' | 'record'>('upload');
  const [soundName, setSoundName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setSoundName('');
    setIsProcessing(false);
    setStatusMsg('');
    setIsRecording(false);
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!soundName) {
        setSoundName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatusMsg('Microphone not supported. Open site with HTTPS.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        if (!soundName) setSoundName(`Recording ${soundsCount + 1}`);
      };

      rec.start();
      setIsRecording(true);
      setStatusMsg('Recording...');
    } catch {
      setStatusMsg('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatusMsg('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const blobToUpload = mode === 'upload' ? selectedFile : recordedBlob;
    if (!blobToUpload) return;

    setIsProcessing(true);
    setStatusMsg('Uploading sound...');

    try {
      const soundId = `custom-${Date.now()}`;
      let audioBlob: Blob = blobToUpload;
      let ext = 'wav';

      if (mode === 'upload' && selectedFile) {
        // Try extract audio track if it's a video
        try {
          const res = await extractAudioFromMediaFile(selectedFile);
          audioBlob = res.audioBlob;
        } catch {
          audioBlob = selectedFile;
        }
        ext = selectedFile.name.split('.').pop() || 'wav';
      }

      const audioUrl = await uploadSoundAudio(roomId, soundId, audioBlob, `sound.${ext}`);

      const newSound: Sound = {
        id: soundId,
        roomId,
        name: soundName.trim() || 'New Sound',
        audioUrl,
        duration: 2.0,
        color: '#6366f1',
        orderIndex: soundsCount + 1,
        volume: 1.0,
      };

      onAddSound(newSound);
      handleClose();
    } catch (err) {
      setStatusMsg('Upload failed. Try again.');
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Sound">
      <div className="space-y-4">
        {/* Simple Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'upload' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> File / Video
          </button>
          <button
            type="button"
            onClick={() => setMode('record')}
            className={`py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'record' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> Record Mic
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          {mode === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 px-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 text-center transition-colors"
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
                    <Check className="w-4 h-4" />
                    <span className="truncate max-w-[240px]">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p className="font-medium text-zinc-200">Tap to select audio or video</p>
                    <p className="text-[11px] text-zinc-500">Supports MP3, WAV, MP4, MOV from gallery</p>
                  </div>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 bg-zinc-900/50 rounded-xl border border-zinc-800/80">
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white text-xs font-semibold animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" /> Stop Recording
                </button>
              ) : recordedBlob ? (
                <div className="flex items-center gap-2">
                  <audio src={recordedUrl || undefined} controls className="h-8 max-w-[200px]" />
                  <button
                    type="button"
                    onClick={startRecording}
                    className="text-xs text-zinc-400 underline"
                  >
                    Re-record
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
                >
                  <Mic className="w-4 h-4 text-red-400" /> Start Recording
                </button>
              )}
            </div>
          )}

          {/* Sound Name Input */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Sound Name</label>
            <input
              type="text"
              value={soundName}
              onChange={(e) => setSoundName(e.target.value)}
              placeholder="e.g. My Meme"
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {statusMsg && <p className="text-xs text-zinc-400 text-center">{statusMsg}</p>}

          <button
            type="submit"
            disabled={isProcessing || (mode === 'upload' ? !selectedFile : !recordedBlob)}
            className="w-full py-2.5 rounded-lg bg-zinc-100 text-zinc-950 font-medium text-xs hover:bg-white disabled:opacity-40 disabled:hover:bg-zinc-100 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              'Save Sound'
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
}
