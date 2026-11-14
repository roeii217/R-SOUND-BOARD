'use client';

import React, { useState, useEffect } from 'react';
import { Mic, Radio } from 'lucide-react';
import { PTTClient } from '../../lib/webrtc/ptt-client';

interface PushToTalkButtonProps {
  pttClient: PTTClient | null;
  isConnected: boolean;
}

export function PushToTalkButton({ pttClient }: PushToTalkButtonProps) {
  const [isPressing, setIsPressing] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (pttClient?.isMicReady()) {
      setMicReady(true);
    }
  }, [pttClient]);

  const handlePointerDown = async (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    if (errorMsg) setErrorMsg(null);

    // Request mic if not ready
    if (pttClient && !pttClient.isMicReady()) {
      const ok = await pttClient.enableMicrophone();
      if (!ok) {
        setErrorMsg('Microphone blocked. Please grant mic permission in your browser.');
        return;
      }
      setMicReady(true);
    }

    setIsPressing(true);
    pttClient?.startTalking();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isPressing) {
      setIsPressing(false);
      pttClient?.stopTalking();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isPressing) {
      setIsPressing(false);
      pttClient?.stopTalking();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto select-none px-3 py-2">
      {errorMsg && (
        <div className="text-center text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg py-1.5 px-3 mb-2">
          {errorMsg}
        </div>
      )}

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ touchAction: 'none' }}
        className={`w-full h-13 py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-100 font-medium text-sm tracking-wide shadow-lg ${
          isPressing
            ? 'bg-emerald-600 text-white scale-[0.98] shadow-emerald-900/40'
            : 'bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 active:scale-[0.99]'
        }`}
      >
        {isPressing ? (
          <>
            <Radio className="w-4 h-4 animate-pulse text-emerald-200" />
            <span className="font-semibold text-white">Transmitting Voice...</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-zinc-400" />
            <span>Hold to Talk</span>
          </>
        )}
      </button>
    </div>
  );
}
