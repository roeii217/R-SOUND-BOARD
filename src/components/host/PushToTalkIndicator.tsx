'use client';

import React from 'react';
import { Mic } from 'lucide-react';

interface PushToTalkIndicatorProps {
  isReceivingAudio: boolean;
  speakerName?: string;
}

export function PushToTalkIndicator({ isReceivingAudio, speakerName = 'Phone Controller' }: PushToTalkIndicatorProps) {
  if (!isReceivingAudio) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 shadow-2xl shadow-emerald-500/30 backdrop-blur-md animate-bounce">
      <div className="relative flex h-3.5 w-3.5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </div>

      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
        <span className="text-xs font-bold text-white tracking-wide">
          LIVE VOICE: <span className="text-emerald-300">{speakerName}</span> is speaking
        </span>
      </div>

      {/* Mini audio wave bars */}
      <div className="flex items-center gap-0.5 h-4 ml-1">
        <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.4s_infinite_alternate] h-2" />
        <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.6s_infinite_alternate_0.2s] h-4" />
        <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.5s_infinite_alternate_0.1s] h-3" />
        <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.7s_infinite_alternate_0.3s] h-4" />
      </div>
    </div>
  );
}
