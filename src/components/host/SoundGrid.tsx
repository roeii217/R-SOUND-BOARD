'use client';

import React, { useState, useEffect } from 'react';
import { Sound, Category } from '../../lib/types/soundboard';
import { SoundButton } from './SoundButton';
import { Plus, Layers } from 'lucide-react';

interface SoundGridProps {
  sounds: Sound[];
  categories: Category[];
  activeSoundIds: Set<string>;
  onPlaySound: (sound: Sound) => void;
  onStopSound: (sound: Sound) => void;
  onDeleteSound?: (soundId: string) => void;
  onRenameSound?: (soundId: string, newName: string) => void;
  onOpenAddModal?: () => void;
  isController?: boolean;
}

export function SoundGrid({
  sounds,
  categories,
  activeSoundIds,
  onPlaySound,
  onStopSound,
  onDeleteSound,
  onRenameSound,
  onOpenAddModal,
  isController = false,
}: SoundGridProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Listen to keyboard hotkeys (1-9) for desktop playback
  useEffect(() => {
    if (isController) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toUpperCase();
      const match = sounds.find((s) => s.hotkey?.toUpperCase() === key);
      if (match) {
        e.preventDefault();
        onPlaySound(match);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sounds, isController, onPlaySound]);

  const filteredSounds = selectedCategoryId === 'all'
    ? sounds
    : sounds.filter((s) => s.categoryId === selectedCategoryId);

  return (
    <div className="space-y-4">
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedCategoryId === 'all'
              ? 'bg-accent text-white shadow-md shadow-indigo-500/25'
              : 'bg-surface hover:bg-surface-light text-zinc-400 hover:text-white border border-surface-border'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> All Sounds ({sounds.length})
        </button>

        {categories.map((cat) => {
          const count = sounds.filter((s) => s.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategoryId === cat.id
                  ? 'bg-accent text-white shadow-md shadow-indigo-500/25'
                  : 'bg-surface hover:bg-surface-light text-zinc-400 hover:text-white border border-surface-border'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Sound Buttons */}
      <div
        className={`grid gap-3 ${
          isController
            ? 'grid-cols-2 sm:grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
        }`}
      >
        {filteredSounds.map((sound) => (
          <SoundButton
            key={sound.id}
            sound={sound}
            isPlaying={activeSoundIds.has(sound.id)}
            onPlay={onPlaySound}
            onStop={onStopSound}
            onDelete={onDeleteSound}
            onRename={onRenameSound}
            isController={isController}
          />
        ))}

        {/* Add Sound Card */}
        {onOpenAddModal && (
          <button
            onClick={onOpenAddModal}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border hover:border-accent/60 bg-surface/40 hover:bg-surface-light/40 text-zinc-400 hover:text-white transition-all group ${
              isController ? 'min-h-[92px]' : 'min-h-[110px]'
            }`}
          >
            <div className="p-2 rounded-xl bg-surface-light group-hover:bg-accent/20 group-hover:text-accent transition-all mb-1">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">Add Sound</span>
          </button>
        )}
      </div>

      {filteredSounds.length === 0 && (
        <div className="text-center py-12 text-zinc-500 text-sm">
          No sounds in this category yet. Click &quot;Add Sound&quot; to upload one!
        </div>
      )}
    </div>
  );
}
