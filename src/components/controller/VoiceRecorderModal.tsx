'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Sound, Category } from '../../lib/types/soundboard';
import { VoiceRecorder, RecordingResult } from '../../lib/audio/voice-recorder';
import { uploadSoundAudio } from '../../lib/storage/sound-storage';
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  categories: Category[];
  soundsCount: number;
  onAddSound: (sound: Sound) => void;
}

const COLOR_OPTIONS = ['#ef4444', '#10b981', '#6366f1', '#06b6d4', '#f97316', '#a855f7'];

export function VoiceRecorderModal({
  isOpen,
  onClose,
  roomId,
  categories,
  soundsCount,
  onAddSound,
}: VoiceRecorderModalProps) {
  const [recorderState, setRecorderState] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [recordedResult, setRecordedResult] = useState<RecordingResult | null>(null);

  // Form fields
  const [soundName, setSoundName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  // Audio preview playback
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      handleDiscard();
    }
  }, [isOpen]);

  const startTimer = () => {
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 0.1);
    }, 100);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleStartRecord = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setElapsedSeconds(0);

    try {
      const rec = new VoiceRecorder((level) => {
        setAudioLevel(level);
      });
      recorderRef.current = rec;
      await rec.start();
      setRecorderState('recording');
      startTimer();
    } catch (err: unknown) {
      setErrorMessage(
        'Could not access microphone. Please grant microphone permission in your browser.'
      );
      console.warn('Microphone error:', err);
    }
  };

  const handlePauseResume = () => {
    const rec = recorderRef.current;
    if (!rec) return;

    if (rec.isPaused()) {
      rec.resume();
      setRecorderState('recording');
      startTimer();
    } else {
      rec.pause();
      setRecorderState('paused');
      stopTimer();
    }
  };

  const handleStopRecord = async () => {
    const rec = recorderRef.current;
    if (!rec) return;

    stopTimer();
    try {
      const result = await rec.stop();
      setRecordedResult(result);
      setRecorderState('review');
      setSoundName(`Recording ${soundsCount + 1}`);
    } catch (err) {
      setErrorMessage('Failed to capture audio recording.');
    }
  };

  const handleTogglePreview = () => {
    if (!previewAudioRef.current || !recordedResult) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  const handleDiscard = () => {
    stopTimer();
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setRecorderState('idle');
    setRecordedResult(null);
    setElapsedSeconds(0);
    setIsPreviewPlaying(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSaveToSoundboard = async () => {
    if (!recordedResult) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const soundId = `sound-${roomId}-${Date.now()}`;
      const ext = recordedResult.mimeType.includes('mp4') ? 'm4a' : 'webm';
      const audioUrl = await uploadSoundAudio(
        roomId,
        soundId,
        recordedResult.blob,
        `voice-record.${ext}`
      );

      const newSound: Sound = {
        id: soundId,
        roomId,
        categoryId: categoryId || null,
        name: soundName.trim() || 'My Voice Sound',
        audioUrl,
        duration: Math.round(recordedResult.duration * 10) / 10,
        color,
        orderIndex: soundsCount,
        volume: 1.0,
      };

      onAddSound(newSound);
      setSuccessMessage(`Saved "${newSound.name}" to soundboard!`);

      setTimeout(() => {
        handleDiscard();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setErrorMessage(`Failed to save recording: ${String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Sound from Microphone">
      <div className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-500/30 rounded-xl text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* STATE: IDLE, RECORDING, PAUSED */}
        {recorderState !== 'review' && (
          <div className="flex flex-col items-center justify-center py-6 space-y-5">
            {/* Live Audio Level Meter */}
            <div className="relative flex items-center justify-center">
              {/* Dynamic pulsing aura based on mic level */}
              <div
                className="absolute rounded-full bg-red-500/20 blur-xl transition-all duration-75"
                style={{
                  width: `${80 + audioLevel * 70}px`,
                  height: `${80 + audioLevel * 70}px`,
                  opacity: recorderState === 'recording' ? 0.8 : 0,
                }}
              />

              <div
                className={`flex items-center justify-center w-24 h-24 rounded-full border-4 transition-all shadow-xl ${
                  recorderState === 'recording'
                    ? 'border-red-500 bg-red-950/50 text-red-400 scale-105'
                    : recorderState === 'paused'
                    ? 'border-amber-500 bg-amber-950/50 text-amber-400'
                    : 'border-surface-border bg-surface text-zinc-400'
                }`}
              >
                <Mic className="w-10 h-10" />
              </div>
            </div>

            {/* Timer Counter */}
            <div className="text-center">
              <span className="font-mono text-2xl font-bold tracking-wider text-white">
                {elapsedSeconds.toFixed(1)}s
              </span>
              <p className="text-xs text-zinc-400 mt-0.5">
                {recorderState === 'idle' && 'Tap record to start microphone capture'}
                {recorderState === 'recording' && 'Recording... speak into phone mic'}
                {recorderState === 'paused' && 'Recording paused'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              {recorderState === 'idle' ? (
                <button
                  onClick={handleStartRecord}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-500/25 active:scale-95 transition-all"
                >
                  <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                  Start Recording
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePauseResume}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-light hover:bg-surface-border text-white text-xs font-semibold border border-surface-border transition-all active:scale-95"
                  >
                    {recorderState === 'paused' ? (
                      <>
                        <Play className="w-4 h-4 fill-current text-emerald-400" /> Resume
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 fill-current text-amber-400" /> Pause
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleStopRecord}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95"
                  >
                    <Square className="w-4 h-4 fill-current" /> Stop &amp; Review
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* STATE: REVIEW AND SAVE */}
        {recorderState === 'review' && recordedResult && (
          <div className="space-y-4 pt-1">
            {/* Audio Preview Element */}
            <audio
              ref={previewAudioRef}
              src={recordedResult.url}
              onEnded={() => setIsPreviewPlaying(false)}
              className="hidden"
            />

            {/* Preview Player Card */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-light border border-surface-border">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTogglePreview}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-accent hover:bg-accent-hover text-white transition-all shadow-md active:scale-95"
                >
                  {isPreviewPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>
                <div>
                  <p className="text-xs font-bold text-white">Audio Preview</p>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Duration: {recordedResult.duration.toFixed(1)}s
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDiscard}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-400 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Re-record
              </button>
            </div>

            {/* Sound Button Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Sound Name</label>
              <input
                type="text"
                required
                value={soundName}
                onChange={(e) => setSoundName(e.target.value)}
                placeholder="Name your sound..."
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

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveToSoundboard}
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Sound...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Save to Soundboard
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
