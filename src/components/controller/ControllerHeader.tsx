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
    <header className="sticky top-0 z-40 w-full bg-zinc-950/95 border-b border-zinc-800 backdrop-blur-md px-3.5 py-2.5 pt-[max(10px,env(safe-area-inset-top))]">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Clean Brand & Live Connection Dot */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
            }`}
          />
          <span className="font-bold text-sm text-zinc-100 tracking-tight">EchoBoard</span>
          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
            {roomId}
          </span>
        </div>

        {/* Right: Phone Speaker Toggle & Big Red STOP Button */}
        <div className="flex items-center gap-2">
          {/* Toggle Phone Sound */}
          <button
            type="button"
            onClick={onTogglePlayOnPhone}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              playOnPhone
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title={playOnPhone ? 'Plays on Phone & PC' : 'Plays on PC only'}
          >
            {playOnPhone ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* STOP ALL Button - Big, Clear, Red, Tactile */}
          <button
            type="button"
            onClick={onStopAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs active:scale-90 transition-all shadow-md shadow-red-900/30"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>STOP</span>
          </button>
        </div>
      </div>
    </header>
  );
}
