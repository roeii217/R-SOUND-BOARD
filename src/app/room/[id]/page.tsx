'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Laptop, Smartphone, Radio, ArrowRight } from 'lucide-react';

export default function RoomDispatcher() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = (params?.id as string)?.toUpperCase() || 'ECHO-DEFAULT';
  const modeParam = searchParams.get('mode');

  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    if (modeParam === 'host') {
      router.replace(`/host/${roomId}`);
      return;
    }
    if (modeParam === 'controller') {
      router.replace(`/controller/${roomId}`);
      return;
    }

    // Auto-detect mobile vs desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    if (isMobile) {
      router.replace(`/controller/${roomId}`);
    } else {
      router.replace(`/host/${roomId}`);
    }
  }, [modeParam, roomId, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-surface-border rounded-3xl p-6 text-center space-y-5 shadow-2xl">
        <div className="h-12 w-12 rounded-2xl bg-accent/20 border border-accent/40 mx-auto flex items-center justify-center">
          <Radio className="w-6 h-6 text-accent animate-pulse" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">Connecting to Room {roomId}</h2>
          <p className="text-xs text-zinc-400 mt-1">Choose how you want to use this device:</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => router.push(`/host/${roomId}`)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface-light hover:bg-surface-border border border-surface-border text-white text-xs font-bold transition-all group"
          >
            <Laptop className="w-6 h-6 text-accent" />
            <span>Host Screen</span>
            <span className="text-[10px] text-zinc-400 font-normal">Plays sound on computer</span>
          </button>

          <button
            onClick={() => router.push(`/controller/${roomId}`)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 group"
          >
            <Smartphone className="w-6 h-6" />
            <span>Phone Controller</span>
            <span className="text-[10px] text-indigo-200 font-normal">Triggers sounds &amp; mic</span>
          </button>
        </div>
      </div>
    </div>
  );
}
