'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Sound, Category, DevicePresence, ScheduledSound } from '../../../lib/types/soundboard';
import { RealtimeManager } from '../../../lib/supabase/realtime';
import { DEFAULT_CATEGORIES, getDefaultSounds } from '../../../lib/presets/default-sounds';
import { ControllerHeader } from '../../../components/controller/ControllerHeader';
import { SoundGrid } from '../../../components/host/SoundGrid';
import { AddSoundModal } from '../../../components/controller/AddSoundModal';
import { QuickVoiceRecorderBar } from '../../../components/controller/QuickVoiceRecorderBar';
import { DelaySelector } from '../../../components/ui/DelaySelector';
import { ScheduledQueue } from '../../../components/host/ScheduledQueue';

export default function ControllerScreen() {
  const params = useParams();
  const roomId = (params?.id as string)?.toUpperCase() || 'ECHO-DEFAULT';

  const [sounds, setSounds] = useState<Sound[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeSoundIds, setActiveSoundIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playOnPhone, setPlayOnPhone] = useState<boolean>(true);
  const [selectedDelay, setSelectedDelay] = useState<number>(0);
  const [pendingQueue, setPendingQueue] = useState<ScheduledSound[]>([]);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const realtimeRef = useRef<RealtimeManager | null>(null);
  const localAudioInstancesRef = useRef<HTMLAudioElement[]>([]);
  const pendingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // 1. Load initial sounds from persistent room store
  useEffect(() => {
    let mounted = true;

    const loadRoomSounds = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/sounds`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.sounds && data.sounds.length > 0) {
            setSounds(data.sounds);
            if (data.categories) setCategories(data.categories);
            return;
          }
        }
      } catch (err) {
        console.warn('Room sound fetch error, using defaults:', err);
      }
      const defaultSounds = await getDefaultSounds(roomId);
      if (mounted) setSounds(defaultSounds);
    };

    loadRoomSounds();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadRoomSounds();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [roomId]);

  // 2. Initialize Realtime Manager
  useEffect(() => {
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
    const osName = isIOS ? 'iPhone' : isAndroid ? 'Android Phone' : 'Mobile';

    const controllerDeviceId = `ctrl-${Math.random().toString(36).substring(2, 9)}`;
    const controllerDevice: DevicePresence = {
      id: controllerDeviceId,
      name: `${osName} (${controllerDeviceId.slice(-4)})`,
      type: 'controller',
      joinedAt: Date.now(),
      os: osName,
    };

    const realtime = new RealtimeManager(roomId, controllerDevice, {
      onPlaySound: (msg) => {
        if (msg.delay && msg.delay > 0 && msg.scheduleId) {
          // If remote host scheduled a sound, also show countdown in controller queue
          const delayMs = msg.delay * 1000;
          const newItem: ScheduledSound = {
            scheduleId: msg.scheduleId,
            sound: {
              id: msg.soundId,
              name: msg.name,
              audioUrl: msg.audioUrl,
              roomId,
              orderIndex: 0,
            },
            delayMs,
            scheduledAt: msg.timestamp || Date.now(),
            endsAt: (msg.timestamp || Date.now()) + delayMs,
          };
          setPendingQueue((prev) => {
            if (prev.some((i) => i.scheduleId === msg.scheduleId)) return prev;
            return [...prev, newItem];
          });
        } else {
          setActiveSoundIds((prev) => new Set(prev).add(msg.soundId));
          setTimeout(() => {
            setActiveSoundIds((prev) => {
              const next = new Set(prev);
              next.delete(msg.soundId);
              return next;
            });
          }, 300);
        }
      },

      onStopSound: (msg) => {
        if (msg.all) {
          stopAllLocalAudio();
          setActiveSoundIds(new Set());
          pendingTimersRef.current.forEach(clearTimeout);
          pendingTimersRef.current.clear();
          setPendingQueue([]);
        } else if (msg.soundId) {
          setActiveSoundIds((prev) => {
            const next = new Set(prev);
            next.delete(msg.soundId!);
            return next;
          });
        }
      },

      onCancelScheduled: (msg) => {
        const t = pendingTimersRef.current.get(msg.scheduleId);
        if (t) {
          clearTimeout(t);
          pendingTimersRef.current.delete(msg.scheduleId);
        }
        setPendingQueue((prev) => prev.filter((i) => i.scheduleId !== msg.scheduleId));
      },

      onSoundboardSync: (msg) => {
        if (msg.sounds && msg.sounds.length > 0) setSounds(msg.sounds);
        if (msg.categories && msg.categories.length > 0) setCategories(msg.categories);
      },

      onPresenceChange: (devs) => {
        const hasHost = devs.some((d) => d.type === 'host');
        setIsConnected(hasHost || devs.length > 1);
      },
    });

    realtime.connect();
    realtimeRef.current = realtime;

    return () => {
      realtime.disconnect();
      stopAllLocalAudio();
      pendingTimersRef.current.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const playLocalAudio = (url: string, volume: number = 1.0) => {
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume));
      localAudioInstancesRef.current.push(audio);
      audio.onended = () => {
        localAudioInstancesRef.current = localAudioInstancesRef.current.filter((a) => a !== audio);
      };
      audio.play().catch(() => {});
    } catch {}
  };

  const stopAllLocalAudio = () => {
    localAudioInstancesRef.current.forEach((audio) => {
      try { audio.pause(); audio.currentTime = 0; } catch {}
    });
    localAudioInstancesRef.current = [];
  };

  const handlePlaySound = (sound: Sound) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(15); } catch {}
    }

    const delay = selectedDelay > 0 ? selectedDelay : (sound.delay || 0);
    const scheduleId = `ctrl-${sound.id}-${Date.now()}`;
    const timestamp = Date.now();

    if (delay > 0) {
      // Queue locally with countdown
      const delayMs = delay * 1000;
      const newItem: ScheduledSound = {
        scheduleId,
        sound,
        delayMs,
        scheduledAt: timestamp,
        endsAt: timestamp + delayMs,
      };
      setPendingQueue((prev) => [...prev, newItem]);

      const t = setTimeout(() => {
        pendingTimersRef.current.delete(scheduleId);
        setPendingQueue((prev) => prev.filter((i) => i.scheduleId !== scheduleId));
        if (playOnPhone || !isConnected) {
          playLocalAudio(sound.audioUrl, sound.volume);
        }
        setActiveSoundIds((prev) => new Set(prev).add(sound.id));
        setTimeout(() => {
          setActiveSoundIds((prev) => { const n = new Set(prev); n.delete(sound.id); return n; });
        }, (sound.duration || 1.5) * 1000);
      }, delayMs);
      pendingTimersRef.current.set(scheduleId, t);

      // Send to host computer with delay info so host can schedule it
      realtimeRef.current?.sendPlaySound({
        soundId: sound.id,
        audioUrl: sound.audioUrl,
        name: sound.name,
        volume: sound.volume,
        loop: sound.loop,
        timestamp,
        delay,
        scheduleId,
      });
    } else {
      // Immediate
      if (playOnPhone || !isConnected) {
        playLocalAudio(sound.audioUrl, sound.volume);
      }
      realtimeRef.current?.sendPlaySound({
        soundId: sound.id,
        audioUrl: sound.audioUrl,
        name: sound.name,
        volume: sound.volume,
        loop: sound.loop,
        timestamp,
      });
      setActiveSoundIds((prev) => new Set(prev).add(sound.id));
      setTimeout(() => {
        setActiveSoundIds((prev) => { const n = new Set(prev); n.delete(sound.id); return n; });
      }, (sound.duration || 1.5) * 1000);
    }
  };

  const handleCancelPending = (scheduleId: string) => {
    const t = pendingTimersRef.current.get(scheduleId);
    if (t) { clearTimeout(t); pendingTimersRef.current.delete(scheduleId); }
    setPendingQueue((prev) => prev.filter((i) => i.scheduleId !== scheduleId));
    realtimeRef.current?.sendCancelScheduled({ scheduleId });
  };

  const handleStopSound = (sound: Sound) => {
    // Stop local audio playback
    localAudioInstancesRef.current.forEach((audio) => {
      try {
        if (audio.src.includes(sound.audioUrl) || audio.src === sound.audioUrl) {
          audio.pause();
          audio.currentTime = 0;
        }
      } catch {}
    });
    setActiveSoundIds((prev) => {
      const next = new Set(prev);
      next.delete(sound.id);
      return next;
    });
    // Tell host to stop this sound
    realtimeRef.current?.sendStopSound({ soundId: sound.id });
  };

  const handleStopAll = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([25, 25, 25]); } catch {}
    }
    stopAllLocalAudio();
    pendingTimersRef.current.forEach((t, id) => {
      clearTimeout(t);
      realtimeRef.current?.sendCancelScheduled({ scheduleId: id });
    });
    pendingTimersRef.current.clear();
    setPendingQueue([]);
    realtimeRef.current?.sendStopSound({ all: true });
    setActiveSoundIds(new Set());
  };

  const handleAddSoundFromMobile = async (newSound: Sound) => {
    const updated = [...sounds.filter((s) => s.id !== newSound.id), newSound];
    setSounds(updated);

    try {
      const res = await fetch(`/api/rooms/${roomId}/sounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sound: newSound }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sounds) setSounds(data.sounds);
      }
    } catch (err) {
      console.warn('Failed to save mobile sound to server:', err);
    }

    realtimeRef.current?.sendSoundboardSync({ sounds: updated, categories });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between select-none">
      <ControllerHeader
        roomId={roomId}
        isConnected={isConnected}
        playOnPhone={playOnPhone}
        onTogglePlayOnPhone={() => setPlayOnPhone(!playOnPhone)}
        onStopAll={handleStopAll}
        onOpenAddModal={() => setShowAddModal(true)}
      />

      <main className="flex-1 max-w-md w-full mx-auto px-3 pb-32 pt-3 space-y-3">
        {/* Playback Delay Selector (Presets 0, 3, 5, 10, 15 + Custom) */}
        <DelaySelector
          selectedDelay={selectedDelay}
          onSelectDelay={setSelectedDelay}
        />

        {/* Scheduled Queue with Live Countdown */}
        {pendingQueue.length > 0 && (
          <ScheduledQueue
            queue={pendingQueue}
            onCancel={handleCancelPending}
            onCancelAll={handleStopAll}
          />
        )}

        <SoundGrid
          sounds={sounds}
          categories={categories}
          activeSoundIds={activeSoundIds}
          onPlaySound={handlePlaySound}
          onStopSound={handleStopSound}
          onOpenAddModal={() => setShowAddModal(true)}
          isController={true}
        />
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <QuickVoiceRecorderBar
          roomId={roomId}
          soundsCount={sounds.length}
          onAddSound={handleAddSoundFromMobile}
          onOpenUploadModal={() => setShowAddModal(true)}
        />
      </div>

      <AddSoundModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        roomId={roomId}
        categories={categories}
        soundsCount={sounds.length}
        onAddSound={handleAddSoundFromMobile}
      />
    </div>
  );
}
