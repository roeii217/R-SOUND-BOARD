'use client';

import React from 'react';
import {
  Volume2,
  VolumeX,
  QrCode,
  Smartphone,
  Square,
  Settings2,
  Radio,
  Sliders,
  Download,
} from 'lucide-react';
import { DevicePresence, PlaybackMode } from '../../lib/types/soundboard';

interface HostHeaderProps {
  roomId: string;
  devices: DevicePresence[];
  volume: number;
  isMuted: boolean;
  playbackMode: PlaybackMode;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  onStopAll: () => void;
  onOpenQRCode: () => void;
  onOpenManager: () => void;
  onOpenInstallGuide: () => void;
}

export function HostHeader({
  roomId,
  devices,
  volume,
  isMuted,
  playbackMode,
  onVolumeChange,
  onMuteToggle,
  onPlaybackModeChange,
  onStopAll,
  onOpenQRCode,
  onOpenManager,
  onOpenInstallGuide,
}: HostHeaderProps) {
  const controllerCount = devices.filter((d) => d.type === 'controller').length;

  return (
    <header className="w-full bg-surface/90 border-b border-surface-border backdrop-blur-md sticky top-0 z-30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand & Room ID */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-accent via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="h-full w-full rounded-[10px] bg-surface flex items-center justify-center">
                <Radio className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div>
              <h1 className="font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
                EchoBoard <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">Host</span>
              </h1>
              <p className="text-[11px] text-zinc-400">Remote Soundboard &amp; Wireless Mic</p>
            </div>
          </div>

          {/* Room Code Badge */}
          <button
            onClick={onOpenQRCode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-light hover:bg-surface-border border border-surface-border text-xs font-semibold text-white transition-all shadow-sm group"
            title="Click to view QR Code"
          >
            <span className="text-zinc-400">ROOM:</span>
            <span className="font-mono text-accent font-bold tracking-wider">{roomId}</span>
            <QrCode className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
          </button>

          {/* Connected Controllers Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-light border border-surface-border text-xs text-zinc-300">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {controllerCount} {controllerCount === 1 ? 'Phone' : 'Phones'} Connected
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                controllerCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
              }`}
            />
          </div>
        </div>

        {/* Right: Audio Controls & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Master Volume Slider */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-light rounded-xl border border-surface-border">
            <button
              onClick={onMuteToggle}
              className="text-zinc-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-zinc-300" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 sm:w-24 accent-accent cursor-pointer h-1.5 bg-surface-border rounded-lg"
            />
            <span className="text-[11px] font-mono text-zinc-400 w-7 text-right">
              {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
            </span>
          </div>

          {/* Playback Mode Dropdown */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-light rounded-xl border border-surface-border text-xs text-zinc-300">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={playbackMode}
              onChange={(e) => onPlaybackModeChange(e.target.value as PlaybackMode)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="polyphonic" className="bg-surface text-white">Polyphonic (Overlap)</option>
              <option value="restart" className="bg-surface text-white">Restart on Tap</option>
              <option value="solo" className="bg-surface text-white">Solo (Cut-off Others)</option>
            </select>
          </div>

          {/* Stop All Button */}
          <button
            onClick={onStopAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Stop all currently playing sounds"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Stop All</span>
          </button>

          {/* Manager Button */}
          <button
            onClick={onOpenManager}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-light hover:bg-surface-border border border-surface-border text-zinc-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Soundboard</span>
          </button>

          {/* Install Guide Button */}
          <button
            onClick={onOpenInstallGuide}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-light hover:bg-surface-border border border-surface-border text-zinc-400 hover:text-white text-xs font-medium transition-all"
            title="PWA Install Guide"
          >
            <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
