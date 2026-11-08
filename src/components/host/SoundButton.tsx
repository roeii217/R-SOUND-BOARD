'use client';

import React, { useState } from 'react';
import { Sound } from '../../lib/types/soundboard';
import { Volume2, Play, Square, MoreVertical, Trash2, Edit3 } from 'lucide-react';

interface SoundButtonProps {
  sound: Sound;
  isPlaying: boolean;
  onPlay: (sound: Sound) => void;
  onStop: (sound: Sound) => void;
  onDelete?: (soundId: string) => void;
  onRename?: (soundId: string, newName: string) => void;
  isController?: boolean;
}

export function SoundButton({
  sound,
  isPlaying,
  onPlay,
  onStop,
  onDelete,
  onRename,
  isController = false,
}: SoundButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(sound.name);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      onStop(sound);
    } else {
      onPlay(sound);
    }
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim() && onRename) {
      onRename(sound.id, editName.trim());
    }
    setIsEditing(false);
  };

  const buttonColor = sound.color || '#6366f1';

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-150 select-none cursor-pointer overflow-hidden ${
        isController ? 'p-3.5 min-h-[92px]' : 'p-4 min-h-[110px]'
      } ${
        isPlaying
          ? 'bg-surface-light border-white/40 shadow-lg scale-[0.98]'
          : 'bg-surface hover:bg-surface-light border-surface-border hover:border-zinc-700 shadow-md active:scale-95'
      }`}
      style={{
        boxShadow: isPlaying ? `0 0 24px ${buttonColor}88, inset 0 0 12px ${buttonColor}33` : undefined,
      }}
    >
      {/* Top row: Color Accent Bar / Hotkey & Menu */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: buttonColor }}
          />
          {sound.hotkey && !isController && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-border text-zinc-300">
              {sound.hotkey}
            </span>
          )}
        </div>

        {/* Action icons / Menu */}
        <div className="flex items-center gap-1">
          {isPlaying ? (
            <span className="flex items-center justify-center p-1 rounded-full bg-red-500/20 text-red-400">
              <Square className="w-3.5 h-3.5 fill-current" />
            </span>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-white">
              <Play className="w-3.5 h-3.5 fill-current" />
            </span>
          )}

          {!isController && (onDelete || onRename) && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-surface-border transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-6 z-20 w-32 rounded-xl bg-surface border border-surface-border p-1 shadow-2xl backdrop-blur-md">
                  {onRename && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsEditing(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-surface-light rounded-lg transition-colors text-left"
                    >
                      <Edit3 className="w-3 h-3" /> Rename
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(sound.id);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle row: Sound Name */}
      <div className="my-1">
        {isEditing ? (
          <form onSubmit={handleSaveRename} onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveRename}
              className="w-full bg-surface-border text-white text-xs px-2 py-1 rounded outline-none border border-accent"
            />
          </form>
        ) : (
          <p className="font-bold text-white text-sm tracking-tight leading-snug line-clamp-2">
            {sound.name}
          </p>
        )}
      </div>

      {/* Bottom row: Duration and Status */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
        <span>{sound.duration ? `${sound.duration.toFixed(1)}s` : 'audio'}</span>
        {isPlaying && (
          <span className="flex items-center gap-1 text-emerald-400 font-sans font-semibold text-[10px]">
            <Volume2 className="w-3 h-3 animate-pulse" /> PLAYING
          </span>
        )}
      </div>
    </div>
  );
}
