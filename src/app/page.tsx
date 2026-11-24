'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radio,
  Sparkles,
  Mic,
  Video,
  Download,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Play,
} from 'lucide-react';
import { InstallGuideModal } from '../components/pwa/InstallGuideModal';

function generateRandomRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'ECHO-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function HomePage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('echoboard_recent_rooms');
      if (saved) {
        setRecentRooms(JSON.parse(saved).slice(0, 3));
      }
    } catch {}
  }, []);

  const saveRecentRoom = (code: string) => {
    try {
      const current = recentRooms.filter((r) => r !== code);
      const updated = [code, ...current].slice(0, 3);
      localStorage.setItem('echoboard_recent_rooms', JSON.stringify(updated));
      setRecentRooms(updated);
    } catch {}
  };

  // One-click launch: auto-detects phone vs computer and goes directly into the soundboard!
  const handleLaunchSoundboard = (customRoom?: string) => {
    const target = (customRoom || roomId).trim().toUpperCase() || generateRandomRoomId();
    saveRecentRoom(target);

    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      router.push(`/controller/${target}`);
    } else {
      router.push(`/host/${target}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between px-4 py-8 max-w-4xl mx-auto">
      {/* Top Navbar */}
      <header className="flex items-center justify-between pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
              <Radio className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <h1 className="font-black text-xl text-white tracking-tight">EchoBoard</h1>
            <p className="text-xs text-zinc-400 font-medium">Wireless Remote Soundboard</p>
          </div>
        </div>

        <button
          onClick={() => setShowInstallGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Install App</span>
        </button>
      </header>

      {/* Main Hero & Quick Action Card */}
      <div className="py-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Remote Audio Controller
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Turn your phone into a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
              wireless soundboard
            </span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Open the soundboard on your computer. Trigger sounds instantly or with delay presets from your phone with zero audible latency.
          </p>
        </div>

        {/* Room Entry Card */}
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl shadow-indigo-950/40 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Room Code
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Enter or create (e.g. ECHO-88)"
                className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-white font-mono text-sm uppercase font-bold tracking-wider placeholder:normal-case placeholder:font-sans placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Recent Rooms */}
          {recentRooms.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-zinc-500">
              <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                <Clock className="w-3 h-3" /> Recent:
              </span>
              {recentRooms.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoomId(r)}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Single Direct Action Button: Goes straight to the soundboard! */}
          <div className="pt-1">
            <button
              onClick={() => handleLaunchSoundboard()}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all group"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Enter Soundboard (כניסה לסאונדבורד)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="pt-1 text-center">
            <button
              onClick={() => {
                const fresh = generateRandomRoomId();
                handleLaunchSoundboard(fresh);
              }}
              className="text-xs text-zinc-400 hover:text-indigo-400 font-medium transition-colors underline"
            >
              ⚡ Start a fresh room with 1-click
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Delayed Playback Queue</h3>
            <p className="text-xs text-zinc-400">
              Set sound delay to 3s, 5s, 10s, 15s or custom. Countdown bars display pending sounds with instant cancellation.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Instant Voice Recording</h3>
            <p className="text-xs text-zinc-400">
              Record voice notes on your phone and automatically add them as new buttons played on the host computer.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Gallery Video Extractor</h3>
            <p className="text-xs text-zinc-400">
              Select videos from your iPhone or Android gallery — EchoBoard demuxes and plays the audio automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-6 border-t border-zinc-800 text-center text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-2">
        <p>EchoBoard • Ultra-Low Latency Soundboard</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> PWA Ready (iOS &amp; Android)
          </span>
        </div>
      </footer>

      {/* PWA Install Guide Modal */}
      <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
    </main>
  );
}
