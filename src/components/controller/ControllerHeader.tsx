'use client';

import React from 'react';
import { Square, ImagePlus, Mic, Download, Radio } from 'lucide-react';

interface ControllerHeaderProps {
  roomId: string;
  isConnected: boolean;
  onStopAll: () => void;
  onOpenGalleryUpload: () => void;
  onOpenVoiceRecorder: () => void;
  onOpenInstallGuide: () => void;
}

export function ControllerHeader({
  roomId,
  isConnected,
  onStopAll,
  onOpenGalleryUpload,
  onOpenVoiceRecorder,
  onOpenInstallGuide,
}: ControllerHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-surface/95 border-b border-surface-border backdrop-blur-md px-3 py-2.5">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Left: Room Badge */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Radio className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">ROOM:</span>
              <span className="font-mono text-xs font-black text-white">{roomId}</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                }`}
              />
            </div>
            <p className="text-[10px] text-zinc-400">Mobile Controller</p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Gallery / Video Upload Button */}
          <button
            onClick={onOpenGalleryUpload}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-light hover:bg-surface-border border border-surface-border text-cyan-400 text-xs font-semibold active:scale-95 transition-all shadow-sm"
            title="Upload from Photos/Videos"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            <span className="text-[11px]">Upload</span>
          </button>

          {/* Record Voice Button */}
          <button
            onClick={onOpenVoiceRecorder}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-light hover:bg-surface-border border border-surface-border text-emerald-400 text-xs font-semibold active:scale-95 transition-all shadow-sm"
            title="Record Microphone"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="text-[11px]">Record</span>
          </button>

          {/* Emergency Stop Button */}
          <button
            onClick={onStopAll}
            className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 active:scale-95 transition-all shadow-sm"
            title="Stop all sounds"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* PWA Install */}
          <button
            onClick={onOpenInstallGuide}
            className="p-2 rounded-xl bg-surface-light border border-surface-border text-zinc-400 hover:text-white active:scale-95 transition-all"
            title="Install App"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
