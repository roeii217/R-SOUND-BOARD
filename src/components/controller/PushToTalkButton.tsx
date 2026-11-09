'use client';

import React, { useState, useEffect } from 'react';
import { Mic, Radio, Volume2, ShieldAlert } from 'lucide-react';
import { PTTClient } from '../../lib/webrtc/ptt-client';

interface PushToTalkButtonProps {
  pttClient: PTTClient | null;
  isConnected: boolean;
}

export function PushToTalkButton({ pttClient, isConnected }: PushToTalkButtonProps) {
  const [isPressing, setIsPressing] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (pttClient?.isMicReady()) {
      setMicReady(true);
    }
  }, [pttClient]);

  const handleEnableMic = async () => {
    if (!pttClient) return;
    setErrorMsg(null);
    const ok = await pttClient.enableMicrophone();
    if (ok) {
      setMicReady(true);
    } else {
      setErrorMsg('Microphone access denied. Please allow microphone in browser settings.');
    }
  };

  const handlePointerDown = async (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    if (!micReady) {
      await handleEnableMic();
    }

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
      {errorMsg && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 mb-2 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="relative">
        {/* Pulsing radiating aura when actively transmitting */}
        {isPressing && (
          <div className="absolute -inset-4 rounded-full bg-emerald-500/30 blur-2xl animate-pulse" />
        )}

        {/* Outer Ring */}
        <div
          className={`relative flex items-center justify-center w-28 h-28 rounded-full transition-all duration-150 shadow-2xl ${
            isPressing
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 scale-95 ring-8 ring-emerald-500/40'
              : micReady
              ? 'bg-gradient-to-tr from-surface-light via-surface to-accent/40 ring-4 ring-accent/30 active:scale-95'
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
              isPressing
                ? 'bg-emerald-950/90'
                : micReady
                ? 'bg-surface hover:bg-surface-light'
                : 'bg-surface hover:bg-surface-light'
            }`}
          >
            {isPressing ? (
              <>
                <Radio className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mt-1">
                  LIVE
                </span>
              </>
            ) : (
              <>
                <Mic className={`w-8 h-8 ${micReady ? 'text-emerald-400' : 'text-accent'}`} />
                <span className="text-[9px] font-black text-zinc-300 uppercase tracking-wider mt-1">
                  {micReady ? 'HOLD TO TALK' : 'TAP / HOLD MIC'}
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
            <Volume2 className="w-3.5 h-3.5" /> Transmitting live microphone to PC...
          </p>
        ) : (
          <p className="text-[11px] text-zinc-400">
            {!micReady
              ? 'Tap to allow mic & hold to speak'
              : isConnected
              ? 'Hold button to speak into computer'
              : 'Hold to test microphone'}
          </p>
        )}
      </div>
    </div>
  );
}
