'use client';

import React, { useState } from 'react';
import { Clock, Check } from 'lucide-react';

interface DelaySelectorProps {
  selectedDelay: number;
  onSelectDelay: (seconds: number) => void;
  className?: string;
}

const PRESETS = [0, 3, 5, 10, 15] as const;

export function DelaySelector({ selectedDelay, onSelectDelay, className = '' }: DelaySelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState(
    PRESETS.includes(selectedDelay as (typeof PRESETS)[number]) ? '' : String(selectedDelay)
  );

  const handlePresetClick = (seconds: number) => {
    setIsCustom(false);
    onSelectDelay(seconds);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customValue);
    if (!isNaN(val) && val >= 0) {
      onSelectDelay(Math.round(val * 10) / 10);
    }
  };

  const isPresetActive = (p: number) => !isCustom && selectedDelay === p;

  return (
    <div className={`flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 ${className}`}>
      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-zinc-300 shrink-0">
        <Clock className={`w-3.5 h-3.5 ${selectedDelay > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-400'}`} />
        <span>Playback Delay:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isPresetActive(preset)
                ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 scale-105'
                : 'bg-zinc-800/80 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60'
            }`}
          >
            {preset === 0 ? 'Instant (0s)' : `${preset}s`}
          </button>
        ))}

        {/* Custom delay option */}
        {!isCustom ? (
          <button
            type="button"
            onClick={() => setIsCustom(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              !PRESETS.includes(selectedDelay as (typeof PRESETS)[number]) && selectedDelay > 0
                ? 'bg-amber-400 text-zinc-950 font-bold'
                : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60'
            }`}
          >
            {!PRESETS.includes(selectedDelay as (typeof PRESETS)[number]) && selectedDelay > 0
              ? `Custom (${selectedDelay}s)`
              : 'Custom...'}
          </button>
        ) : (
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="300"
              step="0.5"
              autoFocus
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="sec"
              className="w-16 px-2 py-1 bg-zinc-950 border border-amber-400 text-white text-xs font-mono rounded-lg outline-none"
            />
            <button
              type="submit"
              className="p-1 rounded-lg bg-amber-400 text-zinc-950 hover:bg-amber-300 transition-colors"
              title="Apply custom delay"
            >
              <Check className="w-3.5 h-3.5 font-bold" />
            </button>
          </form>
        )}
      </div>

      {selectedDelay > 0 && (
        <span className="text-[11px] font-medium text-amber-400/90 ml-auto pr-2">
          Sounds will play after <span className="font-bold underline">{selectedDelay}s</span>
        </span>
      )}
    </div>
  );
}
