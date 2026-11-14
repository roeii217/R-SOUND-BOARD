'use client';

import React from 'react';
import { Square, Plus, Volume2, VolumeX } from 'lucide-react';

interface ControllerHeaderProps {
  roomId: string;
  isConnected: boolean;
  playOnPhone: boolean;
  onTogglePlayOnPhone: () => void;
  onStopAll: () => void;
  onOpenAddModal: () => void;
}

export function ControllerHeader({
  roomId,
  isConnected,
  playOnPhone,
  onTogglePlayOnPhone,
  onStopAll,
  onOpenAddModal,
}: ControllerHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-md px-4 py-3 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Clean Brand & Connection Dot */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-500'
            }`}
            title={isConnected ? 'Connected' : 'Offline'}
          />
          <span className="font-semibold text-sm text-zinc-100 tracking-tight">Soundboard</span>
          <span className="text-[11px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
            {roomId}
          </span>
        </div>

        {/* Right: Only Essential Controls (Stop, Add, Audio toggle) */}
        <div className="flex items-center gap-1.5">
          {/* Phone Speaker Toggle */}
          <button
            type="button"
            onClick={onTogglePlayOnPhone}
            className={`p-2 rounded-lg transition-colors ${
              playOnPhone ? 'text-zinc-200 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={playOnPhone ? 'Sound plays on phone & PC' : 'Sound plays on PC only'}
          >
            {playOnPhone ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Stop All */}
          <button
            type="button"
            onClick={onStopAll}
            className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-900 active:scale-95 transition-all"
            title="Stop all sounds"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* Add Sound */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-medium hover:bg-white active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </header>
  );
}
