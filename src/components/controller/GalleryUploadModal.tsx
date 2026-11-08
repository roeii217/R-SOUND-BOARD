'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Sound, Category } from '../../lib/types/soundboard';
import { extractAudioFromMediaFile, isVideoFile } from '../../lib/audio/video-extractor';
import { uploadSoundAudio } from '../../lib/storage/sound-storage';
import {
  FileVideo,
  FileAudio,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface GalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  categories: Category[];
  soundsCount: number;
  onAddSound: (sound: Sound) => void;
}

const COLOR_OPTIONS = ['#6366f1', '#10b981', '#06b6d4', '#f97316', '#ec4899', '#eab308'];

export function GalleryUploadModal({
  isOpen,
  onClose,
  roomId,
  categories,
  soundsCount,
  onAddSound,
}: GalleryUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [soundName, setSoundName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  // Conversion & upload state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorText(null);
      setSuccessText(null);
      if (!soundName) {
        setSoundName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleProcessAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorText('Please select an audio or video file first.');
      return;
    }

    setIsProcessing(true);
    setProgressPercent(5);
    setStatusText('Preparing file...');
    setErrorText(null);

    try {
      // Step 1: Extract audio track (automatic if video)
      const extracted = await extractAudioFromMediaFile(selectedFile, (pct, msg) => {
        setProgressPercent(pct);
        setStatusText(msg);
      });

      setStatusText('Saving sound button...');
      setProgressPercent(90);

      // Step 2: Upload extracted audio Blob to storage
      const soundId = `sound-${roomId}-${Date.now()}`;
      const audioUrl = await uploadSoundAudio(
        roomId,
        soundId,
        extracted.audioBlob,
        `${extracted.fileName}.wav`
      );

      // Step 3: Add to Soundboard
      const newSound: Sound = {
        id: soundId,
        roomId,
        categoryId: categoryId || null,
        name: soundName.trim() || extracted.fileName,
        audioUrl,
        duration: Math.round(extracted.duration * 10) / 10,
        color,
        orderIndex: soundsCount,
        volume: 1.0,
      };

      onAddSound(newSound);
      setProgressPercent(100);
      setSuccessText(
        extracted.sourceType === 'video'
          ? `Extracted & added audio from "${selectedFile.name}"!`
          : `Added "${newSound.name}" successfully!`
      );

      // Reset
      setSelectedFile(null);
      setSoundName('');
      setTimeout(() => {
        onClose();
        setSuccessText(null);
      }, 1400);
    } catch (err: unknown) {
      console.error('Gallery processing error:', err);
      setErrorText(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const isVideo = selectedFile ? isVideoFile(selectedFile) : false;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload from Phone Gallery">
      <form onSubmit={handleProcessAndSave} className="space-y-4">
        <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/20 p-3 text-xs text-indigo-200">
          ✨ <strong>Automatic Video Conversion:</strong> You can choose videos from your iPhone Photos or Android Gallery. The audio track is extracted directly in your phone browser!
        </div>

        {/* File Picker Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*,.mp4,.mov,.m4a,.mp3,.wav,.webm,.3gp"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-surface-border hover:border-accent bg-surface-light hover:bg-surface-light/80 transition-all text-center"
          >
            {selectedFile ? (
              <div className="flex flex-col items-center gap-1.5">
                {isVideo ? (
                  <FileVideo className="w-8 h-8 text-cyan-400" />
                ) : (
                  <FileAudio className="w-8 h-8 text-accent" />
                )}
                <span className="font-bold text-white text-xs max-w-[240px] truncate">
                  {selectedFile.name}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {isVideo ? '📹 Video File (Auto Audio Extract)' : '🎵 Audio File'} •{' '}
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                </span>
                <span className="text-[10px] text-accent underline mt-1">Tap to change file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                <div className="p-2.5 rounded-full bg-surface-border text-white">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <span className="font-bold text-white text-xs">
                  Tap to Select Video or Audio File
                </span>
                <span className="text-[11px] text-zinc-400">
                  From iPhone Photos, Files, or Android Gallery
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Sound Name Input */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">Sound Button Name</label>
          <input
            type="text"
            required
            value={soundName}
            onChange={(e) => setSoundName(e.target.value)}
            placeholder="e.g. Meme Clip, Funny Laugh"
            className="w-full px-3 py-2 rounded-xl bg-surface-light border border-surface-border text-white text-xs focus:outline-none focus:border-accent"
          />
        </div>

        {/* Category & Color */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-light border border-surface-border text-white text-xs focus:outline-none focus:border-accent"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-surface">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Color Tag</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : 'opacity-70'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] font-semibold text-zinc-300">
              <span>{statusText || 'Processing...'}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-surface-light rounded-full h-2 overflow-hidden border border-surface-border">
              <div
                className="bg-gradient-to-r from-accent to-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorText && (
          <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-500/30 rounded-xl text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {successText && (
          <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successText}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedFile || isProcessing}
          className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Processing &amp; Saving...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Save as Sound Button
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}
