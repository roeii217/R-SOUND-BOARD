'use client';

import React, { useEffect, useState } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import { ScheduledSound } from '../../lib/types/soundboard';

interface ScheduledQueueProps {
  queue: ScheduledSound[];
  onCancel: (scheduleId: string) => void;
  onCancelAll?: () => void;
}

function CountdownBar({ item }: { item: ScheduledSound }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const r = Math.max(0, (item.endsAt - Date.now()) / 1000);
      setRemaining(r);
    };
    update();
    const id = setInterval(update, 50);
    return () => clearInterval(id);
  }, [item.endsAt]);

  const totalSec = Math.max(0.1, item.delayMs / 1000);
  const pct = Math.max(0, Math.min(100, ((totalSec - remaining) / totalSec) * 100));

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="relative flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-75"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-amber-400 w-12 shrink-0 text-right">
        {remaining.toFixed(1)}s
      </span>
    </div>
  );
}

export function ScheduledQueue({ queue, onCancel, onCancelAll }: ScheduledQueueProps) {
  if (queue.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-zinc-900/90 to-zinc-950 p-4 space-y-3 shadow-xl shadow-amber-950/20 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
          <Clock className="w-4 h-4 animate-spin text-amber-400" />
          <span>Scheduled Playback Queue ({queue.length})</span>
        </div>
        {onCancelAll && queue.length > 1 && (
          <button
            type="button"
            onClick={onCancelAll}
            className="text-xs text-red-400 hover:text-red-300 hover:underline font-semibold"
          >
            Cancel All Scheduled
          </button>
        )}
      </div>

      <div className="space-y-2">
        {queue.map((item) => (
          <div
            key={item.scheduleId}
            className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 shadow-sm"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: item.sound.color || '#6366f1' }}
            />
            <span className="text-xs font-semibold text-zinc-100 truncate max-w-[150px] shrink-0">
              {item.sound.name}
            </span>
            <CountdownBar item={item} />
            <button
              type="button"
              onClick={() => onCancel(item.scheduleId)}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white text-xs font-semibold transition-all"
              title="Cancel scheduled sound"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
