'use client';

import React from 'react';
import { Square, ImagePlus, Mic, Download, Radio, Volume2, VolumeX } from 'lucide-react';

interface ControllerHeaderProps {
  roomId: string;
  isConnected: boolean;
  playOnPhone: boolean;
  onTogglePlayOnPhone: () => void;
  onStopAll: () => void;
  onOpenGalleryUpload: () => void;
  onOpenVoiceRecorder: () => void;
  onOpenInstallGuide: () => void;
}

export function ControllerHeader({
  roomId,
  isConnected,
  playOnPhone,
  onTogglePlayOnPhone,
  onStopAll,
  onOpenGalleryUpload,
  onOpenVoiceRecorder,
  onOpenInstallGuide,
}: ControllerHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-surface/98 border-b border-surface-border backdrop-blur-xl px-3 pb-3 pt-[max(14px,env(safe-area-inset-top))] shadow-xl">
      <div className="max-w-md mx-auto flex flex-col gap-2.5">
        {/* Top row: Status & Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Room Badge */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 text-accent animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-black text-white tracking-wider">{roomId}</span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                    }`}
                  />
                  {isConnected ? 'SYNCED' : 'STANDALONE'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                {isConnected ? 'Connected to computer' : 'Playing locally on phone'}
              </p>
            </div>
          </div>

          {/* Right: Phone Speaker Toggle & Stop All */}
          <div className="flex items-center gap-2">
            {/* Phone Audio Toggle Button */}
            <button
              type="button"
              onClick={onTogglePlayOnPhone}
              className={`flex items-center justify-center h-10 px-2.5 rounded-xl border text-xs font-bold transition-all touch-manipulation active:scale-90 ${
                playOnPhone
                  ? 'bg-accent/25 border-accent text-accent'
                  : 'bg-surface-light border-surface-border text-zinc-400'
              }`}
              title="Toggle sound playing on phone speaker too"
            >
              {playOnPhone ? <Volume2 className="w-4 h-4 mr-1 text-accent" /> : <VolumeX className="w-4 h-4 mr-1 text-zinc-400" />}
              <span className="text-[11px]">{playOnPhone ? 'Phone: ON' : 'Phone: OFF'}</span>
            </button>

            {/* Emergency Stop Button */}
            <button
              type="button"
              onClick={onStopAll}
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 active:scale-90 transition-all touch-manipulation shadow-sm shrink-0"
              title="Stop all sounds"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Action Bar (Upload, Record, Install) - Large, accessible touch targets */}
        <div className="grid grid-cols-3 gap-2">
          {/* Gallery / Video Upload Button */}
          <button
            type="button"
            onClick={onOpenGalleryUpload}
            className="flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl bg-surface-light active:bg-surface-border border border-surface-border text-cyan-400 text-xs font-bold active:scale-95 transition-all shadow-sm touch-manipulation"
          >
            <ImagePlus className="w-4 h-4 shrink-0" />
            <span className="truncate">Upload</span>
          </button>

          {/* Record Voice Button */}
          <button
            type="button"
            onClick={onOpenVoiceRecorder}
            className="flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl bg-surface-light active:bg-surface-border border border-surface-border text-emerald-400 text-xs font-bold active:scale-95 transition-all shadow-sm touch-manipulation"
          >
            <Mic className="w-4 h-4 shrink-0" />
            <span className="truncate">Record</span>
          </button>

          {/* PWA Install Button */}
          <button
            type="button"
            onClick={onOpenInstallGuide}
            className="flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl bg-surface-light active:bg-surface-border border border-surface-border text-zinc-300 text-xs font-bold active:scale-95 transition-all shadow-sm touch-manipulation"
          >
            <Download className="w-4 h-4 shrink-0 text-accent" />
            <span className="truncate">Install</span>
          </button>
        </div>
      </div>
    </header>
  );
}
