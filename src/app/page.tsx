'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radio,
  Laptop,
  Smartphone,
  Sparkles,
  Mic,
  Video,
  Download,
  ArrowRight,
  ShieldCheck,
  Zap,
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
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleLaunchHost = (customRoom?: string) => {
    const target = (customRoom || roomId).trim().toUpperCase() || generateRandomRoomId();
    router.push(`/host/${target}`);
  };

  const handleLaunchController = (customRoom?: string) => {
    const target = (customRoom || roomId).trim().toUpperCase() || generateRandomRoomId();
    router.push(`/controller/${target}`);
  };

  return (
    <main className="min-h-screen flex flex-col justify-between px-4 py-8 max-w-4xl mx-auto">
      {/* Top Navbar */}
      <header className="flex items-center justify-between pb-6 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-accent via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full rounded-[14px] bg-surface flex items-center justify-center">
              <Radio className="w-5 h-5 text-accent" />
            </div>
          </div>
          <div>
            <h1 className="font-black text-xl text-white tracking-tight">EchoBoard</h1>
            <p className="text-xs text-zinc-400 font-medium">Remote Soundboard &amp; Wireless Mic</p>
          </div>
        </div>

        <button
          onClick={() => setShowInstallGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-light hover:bg-surface-border border border-surface-border text-zinc-300 text-xs font-semibold transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-accent" />
          <span>Install PWA</span>
        </button>
      </header>

      {/* Main Hero & Quick Action Card */}
      <div className="py-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Remote Audio Controller
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Turn your phone into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-purple-400 to-cyan-400">wireless soundboard</span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Open the soundboard on your computer. Tap sounds or talk through your microphone on your phone with instant sub-50ms playback.
          </p>
        </div>

        {/* Room Entry Card */}
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-surface border border-surface-border shadow-2xl shadow-indigo-950/40 space-y-5">
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
                className="w-full px-4 py-3 rounded-2xl bg-surface-light border border-surface-border text-white font-mono text-sm uppercase font-bold tracking-wider placeholder:normal-case placeholder:font-sans placeholder:text-zinc-500 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => handleLaunchHost()}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all active:scale-95 group"
            >
              <Laptop className="w-4 h-4" />
              <span>Launch Host (PC)</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => handleLaunchController()}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-surface-light hover:bg-surface-border border border-surface-border text-white font-bold text-xs transition-all active:scale-95 group"
            >
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Open Controller</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => {
                const fresh = generateRandomRoomId();
                handleLaunchHost(fresh);
              }}
              className="text-xs text-zinc-400 hover:text-accent font-medium transition-colors underline"
            >
              ⚡ Click here to start a fresh room with 1-click
            </button>
          </div>
        </div>

        {/* Feature Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-surface/60 border border-surface-border space-y-1.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-accent w-fit">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Real-time Room Sync</h3>
            <p className="text-xs text-zinc-400">
              Supabase Realtime broadcast channels deliver sound triggers instantly to your computer with zero audible lag.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface/60 border border-surface-border space-y-1.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Wireless Push-to-Talk</h3>
            <p className="text-xs text-zinc-400">
              Hold the PTT button on your phone to stream live microphone audio straight into your computer speakers over WebRTC.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface/60 border border-surface-border space-y-1.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Gallery Video Extractor</h3>
            <p className="text-xs text-zinc-400">
              Upload video clips directly from iPhone Photos or Android Gallery. EchoBoard extracts the audio track in-browser.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-6 border-t border-surface-border text-center text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-2">
        <p>EchoBoard • Inspired by RC Web Soundboard</p>
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
