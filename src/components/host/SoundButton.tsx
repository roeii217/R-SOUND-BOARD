'use client';

import React, { useState } from 'react';
import { Sound } from '../../lib/types/soundboard';
import { Volume2, MoreVertical, Trash2, Edit3, Square, Play } from 'lucide-react';

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
  const [flash, setFlash] = useState(false);

  // If the sound is currently playing, clicking it stops it!
  // If not playing, clicking plays it (supports rapid spamming).
  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      onStop(sound);
    } else {
      setFlash(true);
      setTimeout(() => setFlash(false), 160);
      onPlay(sound);
    }
  };

  const handleStopExplicit = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onStop(sound);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim() && onRename) {
      onRename(sound.id, editName.trim());
    }
    setIsEditing(false);
  };

  const buttonColor = sound.color || '#6366f1';
  const hasDelay = sound.delay && sound.delay > 0;

  const containerStyle: React.CSSProperties = {
    touchAction: 'manipulation',
    backgroundColor: isPlaying ? 'rgba(239, 68, 68, 0.12)' : undefined,
    borderColor: isPlaying ? '#ef4444' : undefined,
    transform: flash ? 'scale(0.92)' : undefined,
  };

  return (
    <div
      onClick={handleClick}
      style={containerStyle}
      className={`group relative flex flex-col justify-between rounded-2xl border select-none cursor-pointer overflow-hidden transition-all duration-100 ${
        isController ? 'p-3 min-h-[88px]' : 'p-3.5 min-h-[102px]'
      } ${
        isPlaying
          ? 'ring-2 ring-red-500/50 shadow-lg shadow-red-950/40 bg-red-950/20'
          : 'bg-zinc-900/90 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700 shadow-sm'
      }`}
    >
      {/* Top row: Color Accent Dot / Hotkey / Menu / Playing status */}
      <div className="flex items-center justify-between w-full relative z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${isPlaying ? 'bg-red-500 animate-pulse' : ''}`}
            style={{ backgroundColor: isPlaying ? '#ef4444' : buttonColor }}
          />
          {hasDelay && (
            <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              +{sound.delay}s
            </span>
          )}
          {sound.hotkey && !isController && (
            <span className="text-[10px] font-mono font-medium px-1 rounded bg-zinc-800 text-zinc-400">
              {sound.hotkey}
            </span>
          )}
        </div>

        {/* STOP button when playing OR options menu when idle */}
        {isPlaying ? (
          <button
            type="button"
            onClick={handleStopExplicit}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-black transition-all shadow-md animate-pulse"
            title="Click to Stop this sound"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>STOP</span>
          </button>
        ) : (
          !isController && (onDelete || onRename) && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-6 z-20 w-32 rounded-xl bg-zinc-900 border border-zinc-800 p-1 shadow-2xl backdrop-blur-md">
                  {onRename && (
                    <button
                      onClick={() => { setShowMenu(false); setIsEditing(true); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-left"
                    >
                      <Edit3 className="w-3 h-3" /> Rename
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => { setShowMenu(false); onDelete(sound.id); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Middle row: Sound Name */}
      <div className="my-1.5 relative z-10">
        {isEditing ? (
          <form onSubmit={handleSaveRename} onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveRename}
              className="w-full bg-zinc-800 text-white text-xs px-2 py-1 rounded outline-none border border-zinc-600"
            />
          </form>
        ) : (
          <p className={`font-semibold text-sm tracking-tight leading-snug line-clamp-2 ${isPlaying ? 'text-red-200' : 'text-zinc-100'}`}>
            {sound.name}
          </p>
        )}
      </div>

      {/* Bottom row: Duration and Status */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono relative z-10">
        <span>{sound.duration ? `${sound.duration.toFixed(1)}s` : 'audio'}</span>
        {isPlaying ? (
          <span className="flex items-center gap-1 text-red-400 font-sans font-bold text-[10px]">
            <Volume2 className="w-3 h-3 animate-pulse" /> Playing (Tap to Stop)
          </span>
        ) : (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 font-sans flex items-center gap-0.5">
            <Play className="w-2.5 h-2.5 fill-current" /> Tap
          </span>
        )}
      </div>
    </div>
  );
}
