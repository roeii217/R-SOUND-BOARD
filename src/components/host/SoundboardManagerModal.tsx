'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Sound, Category } from '../../lib/types/soundboard';
import { uploadSoundAudio, blobToBase64, urlToBlob } from '../../lib/storage/sound-storage';
import {
  Upload,
  Download,
  RotateCcw,
  Plus,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface SoundboardManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  sounds: Sound[];
  categories: Category[];
  onAddSound: (newSound: Sound) => void;
  onImportSounds: (sounds: Sound[], categories: Category[]) => void;
  onResetDefaults: () => void;
}

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#ec4899', // Pink
];

export function SoundboardManagerModal({
  isOpen,
  onClose,
  roomId,
  sounds,
  categories,
  onAddSound,
  onImportSounds,
  onResetDefaults,
}: SoundboardManagerModalProps) {
  const [tab, setTab] = useState<'add' | 'export_import'>('add');

  // Add sound form state
  const [soundName, setSoundName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [hotkey, setHotkey] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      if (!soundName) {
        setSoundName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleCreateSound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !soundName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please choose an audio file and name.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const soundId = `sound-${roomId}-${Date.now()}`;
      const audioUrl = await uploadSoundAudio(roomId, soundId, audioFile, audioFile.name);

      // Estimate duration
      let duration = 1.0;
      try {
        const audio = new Audio(audioUrl);
        await new Promise<void>((res) => {
          audio.onloadedmetadata = () => {
            duration = audio.duration;
            res();
          };
          audio.onerror = () => res();
        });
      } catch {}

      const newSound: Sound = {
        id: soundId,
        roomId,
        categoryId: categoryId || null,
        name: soundName.trim(),
        audioUrl,
        duration: Math.round(duration * 10) / 10,
        color,
        hotkey: hotkey.trim().toUpperCase() || undefined,
        orderIndex: sounds.length,
        volume: 1.0,
      };

      onAddSound(newSound);
      setStatusMessage({ type: 'success', text: `Added "${newSound.name}" successfully!` });
      setSoundName('');
      setAudioFile(null);
      setHotkey('');
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to add sound: ${String(err)}` });
    } finally {
      setIsUploading(false);
    }
  };

  // Export Soundboard Configuration as JSON
  const handleExportJSON = async () => {
    try {
      setIsUploading(true);
      // Package sounds with base64 audio where possible
      const exportSounds = await Promise.all(
        sounds.map(async (s) => {
          try {
            if (s.audioUrl.startsWith('blob:') || s.audioUrl.startsWith('http')) {
              const blob = await urlToBlob(s.audioUrl);
              const base64 = await blobToBase64(blob);
              return { ...s, audioUrl: base64 };
            }
          } catch {}
          return s;
        })
      );

      const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        categories,
        sounds: exportSounds,
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `echoboard_${roomId}_config.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.warn('Export failed:', e);
    } finally {
      setIsUploading(false);
    }
  };

  // Import Soundboard Configuration from JSON
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    try {
      setIsUploading(true);
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed.sounds)) {
        onImportSounds(parsed.sounds, parsed.categories || categories);
        setStatusMessage({
          type: 'success',
          text: `Imported ${parsed.sounds.length} sounds successfully!`,
        });
      } else {
        throw new Error('Invalid JSON schema');
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to import file: ${String(err)}` });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Soundboard Manager" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-light p-1 border border-surface-border">
          <button
            onClick={() => setTab('add')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'add' ? 'bg-accent text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Add New Sound
          </button>
          <button
            onClick={() => setTab('export_import')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'export_import' ? 'bg-accent text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Backup &amp; Presets
          </button>
        </div>

        {statusMessage && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/60 border border-red-500/30 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* TAB 1: ADD SOUND */}
        {tab === 'add' && (
          <form onSubmit={handleCreateSound} className="space-y-3.5">
            {/* Audio File Picker */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Audio File (MP3, WAV, WebM, OGG, M4A)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-surface-border hover:border-accent bg-surface-light hover:bg-surface-light/80 text-zinc-300 text-xs font-medium transition-all"
              >
                <FileAudio className="w-4 h-4 text-accent" />
                <span>{audioFile ? audioFile.name : 'Choose audio file from computer...'}</span>
              </button>
            </div>

            {/* Sound Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Sound Name</label>
              <input
                type="text"
                required
                value={soundName}
                onChange={(e) => setSoundName(e.target.value)}
                placeholder="e.g. Cartoon Slip, Metal Pipe, Laugh Track"
                className="w-full px-3 py-2 rounded-xl bg-surface-light border border-surface-border text-white text-xs focus:outline-none focus:border-accent"
              />
            </div>

            {/* Category Selector */}
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

            {/* Hotkey & Color */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Keyboard Hotkey (Optional)
                </label>
                <input
                  type="text"
                  maxLength={1}
                  value={hotkey}
                  onChange={(e) => setHotkey(e.target.value)}
                  placeholder="e.g. 9 or Q"
                  className="w-full px-3 py-2 rounded-xl bg-surface-light border border-surface-border text-white text-xs focus:outline-none focus:border-accent uppercase text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Color Tag</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-all ${
                        color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading || !audioFile}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Add to Soundboard
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: EXPORT / IMPORT / RESET */}
        {tab === 'export_import' && (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-xl bg-surface-light border border-surface-border space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-accent" /> Export Configuration
              </h4>
              <p className="text-[11px] text-zinc-400">
                Download a JSON backup of your current soundboard, sound buttons, and categories.
              </p>
              <button
                onClick={handleExportJSON}
                disabled={isUploading}
                className="w-full py-2 rounded-lg bg-surface border border-surface-border hover:bg-surface-border text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Soundboard JSON
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-light border border-surface-border space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" /> Import Configuration
              </h4>
              <p className="text-[11px] text-zinc-400">
                Restore a previously exported soundboard configuration file.
              </p>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-2 rounded-lg bg-surface border border-surface-border hover:bg-surface-border text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Select JSON File to Import
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20 space-y-2">
              <h4 className="text-xs font-bold text-red-300 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-400" /> Reset to Defaults
              </h4>
              <p className="text-[11px] text-zinc-400">
                Restore the default royalty-free sound effects pack (Airhorn, 808 Boom, Sci-Fi Laser, etc.).
              </p>
              <button
                onClick={() => {
                  if (confirm('Reset soundboard to default sounds?')) {
                    onResetDefaults();
                    setStatusMessage({ type: 'success', text: 'Reset to default sound pack!' });
                  }
                }}
                className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors"
              >
                Reset Default Sounds
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
