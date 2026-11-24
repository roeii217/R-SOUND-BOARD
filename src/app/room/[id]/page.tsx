'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Radio, Loader2 } from 'lucide-react';

export default function RoomDispatcher() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = (params?.id as string)?.toUpperCase() || 'ECHO-DEFAULT';
  const modeParam = searchParams.get('mode');

  useEffect(() => {
    if (modeParam === 'host') {
      router.replace(`/host/${roomId}`);
      return;
    }
    if (modeParam === 'controller') {
      router.replace(`/controller/${roomId}`);
      return;
    }

    // Auto-detect mobile phone vs desktop computer and go directly to soundboard
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      router.replace(`/controller/${roomId}`);
    } else {
      router.replace(`/host/${roomId}`);
    }
  }, [modeParam, roomId, router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Radio className="w-6 h-6 text-indigo-400 animate-pulse" />
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">Opening Room {roomId}...</h2>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          <span>Loading Soundboard...</span>
        </div>
      </div>
    </div>
  );
}
