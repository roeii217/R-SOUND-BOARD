'use client';

import React, { useState, useRef } from 'react';
import { Mic, Radio, Volume2 } from 'lucide-react';
import { PTTClient } from '../../lib/webrtc/ptt-client';

interface PushToTalkButtonProps {
  pttClient: PTTClient | null;
  isConnected: boolean;
}

export function PushToTalkButton({ pttClient, isConnected }: PushToTalkButtonProps) {
  const [isPressing, setIsPressing] = useState(false);
  const pressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    setIsPressing(true);
    if (pttClient) {
      pttClient.startTalking();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsPressing(false);
    if (pttClient) {
      pttClient.stopTalking();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsPressing(false);
    if (pttClient) {
      pttClient.stopTalking();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 select-none">
      <div className="relative">
        {/* Pulsing radiating aura when actively transmitting */}
        {isPressing && (
          <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
        )}

        {/* Outer Ring */}
        <div
          className={`relative flex items-center justify-center w-28 h-28 rounded-full transition-all duration-150 shadow-2xl ${
            isPressing
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 scale-95 ring-8 ring-emerald-500/30'
              : 'bg-gradient-to-tr from-surface-light via-surface to-surface-border ring-4 ring-surface-border active:scale-95'
          }`}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{ touchAction: 'none' }}
        >
          {/* Inner tactile button face */}
          <div
            className={`flex flex-col items-center justify-center w-24 h-24 rounded-full transition-colors ${
              isPressing ? 'bg-emerald-950/80' : 'bg-surface hover:bg-surface-light'
            }`}
          >
            {isPressing ? (
              <>
                <Radio className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest mt-1">
                  LIVE
                </span>
              </>
            ) : (
              <>
                <Mic className="w-8 h-8 text-accent" />
                <span className="text-[9px] font-extrabold text-zinc-300 uppercase tracking-wider mt-1">
                  HOLD TO TALK
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Caption & Status */}
      <div className="mt-2 text-center">
        {isPressing ? (
          <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5 animate-pulse">
            <Volume2 className="w-3.5 h-3.5" /> Transmitting microphone audio...
          </p>
        ) : (
          <p className="text-[11px] text-zinc-400">
            {isConnected ? 'Press & hold to speak through computer' : 'Connecting audio stream...'}
          </p>
        )}
      </div>
    </div>
  );
}
