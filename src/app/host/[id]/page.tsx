'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Volume2 } from 'lucide-react';
import { Sound, Category, DevicePresence, PlaybackMode, ScheduledSound } from '../../../lib/types/soundboard';
import { AudioEngine } from '../../../lib/audio/audio-engine';
import { RealtimeManager } from '../../../lib/supabase/realtime';
import { DEFAULT_CATEGORIES, getDefaultSounds } from '../../../lib/presets/default-sounds';
import { HostHeader } from '../../../components/host/HostHeader';
import { AudioVisualizer } from '../../../components/host/AudioVisualizer';
import { SoundGrid } from '../../../components/host/SoundGrid';
import { ScheduledQueue } from '../../../components/host/ScheduledQueue';
import { DelaySelector } from '../../../components/ui/DelaySelector';
import { QRCodeModal } from '../../../components/host/QRCodeModal';
import { SoundboardManagerModal } from '../../../components/host/SoundboardManagerModal';
import { InstallGuideModal } from '../../../components/pwa/InstallGuideModal';

export default function HostScreen() {
  const params = useParams();
  const roomId = (params?.id as string)?.toUpperCase() || 'ECHO-DEFAULT';

  // Room State
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [devices, setDevices] = useState<DevicePresence[]>([]);
  const [activeSoundIds, setActiveSoundIds] = useState<Set<string>>(new Set());
  const [scheduledQueue, setScheduledQueue] = useState<ScheduledSound[]>([]);
  const [selectedDelay, setSelectedDelay] = useState<number>(0); // 0 = instant, 3, 5, 10, 15, or custom
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState<boolean>(false);

  // Audio Controls State
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('polyphonic');

  // Modals
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [showManagerModal, setShowManagerModal] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  // References
  const realtimeRef = useRef<RealtimeManager | null>(null);
  const activeSoundTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Helper: mark a sound as active, auto-clear after its duration
  const markActive = useCallback((soundId: string, duration?: number) => {
    setActiveSoundIds((prev) => new Set(prev).add(soundId));
    const existing = activeSoundTimersRef.current.get(soundId);
    if (existing) clearTimeout(existing);
    const ms = Math.max(500, (duration || 2.0) * 1000 + 300);
    const t = setTimeout(() => {
      setActiveSoundIds((prev) => {
        const next = new Set(prev);
        next.delete(soundId);
        return next;
      });
      activeSoundTimersRef.current.delete(soundId);
    }, ms);
    activeSoundTimersRef.current.set(soundId, t);
  }, []);

  // 1. Initialize Default Sounds and Audio Engine
  useEffect(() => {
    let mounted = true;
    getDefaultSounds(roomId).then((defaultSounds) => {
      if (mounted) setSounds(defaultSounds);
    });

    const engine = AudioEngine.getInstance();
    setVolume(engine.getVolume());
    setIsMuted(engine.getIsMuted());
    setPlaybackMode(engine.getPlaybackMode());

    const ctx = engine.init();
    if (ctx.state === 'suspended') {
      setNeedsAudioUnlock(true);
    }

    const unlockAudio = () => {
      engine.resume().then(() => setNeedsAudioUnlock(false));
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      mounted = false;
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      activeSoundTimersRef.current.forEach(clearTimeout);
    };
  }, [roomId]);

  // 2. Setup Realtime
  useEffect(() => {
    const hostDeviceId = `host-${Math.random().toString(36).substring(2, 9)}`;
    const hostDevice: DevicePresence = {
      id: hostDeviceId,
      name: 'Computer Host',
      type: 'host',
      joinedAt: Date.now(),
      os: 'Desktop',
    };

    const realtime = new RealtimeManager(roomId, hostDevice, {
      onPlaySound: (msg) => {
        const engine = AudioEngine.getInstance();
        const soundDuration = sounds.find((s) => s.id === msg.soundId)?.duration;

        if (msg.delay && msg.delay > 0 && msg.scheduleId) {
          // Delayed playback from remote controller
          const delayMs = msg.delay * 1000;
          const newItem: ScheduledSound = {
            scheduleId: msg.scheduleId,
            sound: {
              id: msg.soundId,
              name: msg.name,
              audioUrl: msg.audioUrl,
              color: sounds.find((s) => s.id === msg.soundId)?.color,
              volume: msg.volume,
              loop: msg.loop,
              roomId,
              orderIndex: 0,
            },
            delayMs,
            scheduledAt: Date.now(),
            endsAt: Date.now() + delayMs,
          };
          setScheduledQueue((prev) => [...prev, newItem]);

          engine.schedulePlay({
            scheduleId: msg.scheduleId,
            delayMs,
            soundId: msg.soundId,
            audioUrl: msg.audioUrl,
            volume: msg.volume,
            loop: msg.loop,
            playbackMode: msg.playbackMode,
            onPlay: () => {
              setScheduledQueue((prev) => prev.filter((i) => i.scheduleId !== msg.scheduleId));
              markActive(msg.soundId, soundDuration);
            },
          });
        } else {
          // Immediate playback
          engine.play({
            soundId: msg.soundId,
            audioUrl: msg.audioUrl,
            volume: msg.volume,
            loop: msg.loop,
            playbackMode: msg.playbackMode,
          });
          markActive(msg.soundId, soundDuration);

          try {
            confetti({
              particleCount: 20,
              spread: 45,
              origin: { y: 0.9 },
              colors: ['#6366f1', '#10b981', '#06b6d4', '#f97316'],
            });
          } catch {}
        }
      },

      onStopSound: (msg) => {
        const engine = AudioEngine.getInstance();
        if (msg.all) {
          engine.stopAll();
          setActiveSoundIds(new Set());
          setScheduledQueue([]);
          activeSoundTimersRef.current.forEach(clearTimeout);
          activeSoundTimersRef.current.clear();
        } else if (msg.soundId) {
          engine.stop(msg.soundId);
          const t = activeSoundTimersRef.current.get(msg.soundId);
          if (t) {
            clearTimeout(t);
            activeSoundTimersRef.current.delete(msg.soundId);
          }
          setActiveSoundIds((prev) => {
            const next = new Set(prev);
            next.delete(msg.soundId!);
            return next;
          });
        }
      },

      onCancelScheduled: (msg) => {
        const engine = AudioEngine.getInstance();
        engine.cancelScheduled(msg.scheduleId);
        setScheduledQueue((prev) => prev.filter((i) => i.scheduleId !== msg.scheduleId));
      },

      onVolumeChange: (msg) => {
        const engine = AudioEngine.getInstance();
        engine.setVolume(msg.volume);
        engine.setMuted(msg.isMuted);
        setVolume(msg.volume);
        setIsMuted(msg.isMuted);
      },

      onSoundboardSync: (msg) => {
        if (msg.sounds && msg.sounds.length > 0) setSounds(msg.sounds);
        if (msg.categories && msg.categories.length > 0) setCategories(msg.categories);
      },

      onPresenceChange: (devs) => {
        setDevices(devs);
      },
    });

    realtime.connect();
    realtimeRef.current = realtime;

    return () => {
      realtime.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Audio Playback Handlers (host local buttons)
  const handlePlaySound = (sound: Sound) => {
    const engine = AudioEngine.getInstance();
    const effectiveDelay = selectedDelay > 0 ? selectedDelay : (sound.delay || 0);

    if (effectiveDelay > 0) {
      const scheduleId = `host-${sound.id}-${Date.now()}`;
      const delayMs = effectiveDelay * 1000;
      const newItem: ScheduledSound = {
        scheduleId,
        sound,
        delayMs,
        scheduledAt: Date.now(),
        endsAt: Date.now() + delayMs,
      };
      setScheduledQueue((prev) => [...prev, newItem]);

      // Broadcast to phone controllers so their queues show the countdown too
      realtimeRef.current?.sendPlaySound({
        soundId: sound.id,
        audioUrl: sound.audioUrl,
        name: sound.name,
        volume: sound.volume,
        loop: sound.loop,
        timestamp: Date.now(),
        delay: effectiveDelay,
        scheduleId,
      });

      engine.schedulePlay({
        scheduleId,
        delayMs,
        soundId: sound.id,
        audioUrl: sound.audioUrl,
        volume: sound.volume,
        loop: sound.loop,
        onPlay: () => {
          setScheduledQueue((prev) => prev.filter((i) => i.scheduleId !== scheduleId));
          markActive(sound.id, sound.duration);
        },
      });
    } else {
      engine.play({
        soundId: sound.id,
        audioUrl: sound.audioUrl,
        volume: sound.volume,
        loop: sound.loop,
      });
      markActive(sound.id, sound.duration);

      // Also trigger locally/broadcast
      realtimeRef.current?.sendPlaySound({
        soundId: sound.id,
        audioUrl: sound.audioUrl,
        name: sound.name,
        volume: sound.volume,
        loop: sound.loop,
        timestamp: Date.now(),
      });
    }
  };

  // INDIVIDUAL SOUND STOP: Stops the specific playing sound immediately!
  const handleStopSound = (sound: Sound) => {
    const engine = AudioEngine.getInstance();
    engine.stop(sound.id);

    const t = activeSoundTimersRef.current.get(sound.id);
    if (t) {
      clearTimeout(t);
      activeSoundTimersRef.current.delete(sound.id);
    }

    setActiveSoundIds((prev) => {
      const next = new Set(prev);
      next.delete(sound.id);
      return next;
    });

    // Notify connected controllers to stop this sound too
    realtimeRef.current?.sendStopSound({ soundId: sound.id });
  };

  // STOP ALL: Instantly cancels both all active sounds and all scheduled/pending sounds
  const handleStopAll = () => {
    const engine = AudioEngine.getInstance();
    engine.stopAll();
    setActiveSoundIds(new Set());

    // Cancel all scheduled items and notify controller
    scheduledQueue.forEach((item) => {
      engine.cancelScheduled(item.scheduleId);
      realtimeRef.current?.sendCancelScheduled({ scheduleId: item.scheduleId });
    });
    setScheduledQueue([]);
    activeSoundTimersRef.current.forEach(clearTimeout);
    activeSoundTimersRef.current.clear();
    realtimeRef.current?.sendStopSound({ all: true });
  };

  // CANCEL INDIVIDUAL SCHEDULED SOUND
  const handleCancelScheduled = (scheduleId: string) => {
    AudioEngine.getInstance().cancelScheduled(scheduleId);
    setScheduledQueue((prev) => prev.filter((i) => i.scheduleId !== scheduleId));
    realtimeRef.current?.sendCancelScheduled({ scheduleId });
  };

  const handleCancelAllScheduled = () => {
    scheduledQueue.forEach((item) => {
      AudioEngine.getInstance().cancelScheduled(item.scheduleId);
      realtimeRef.current?.sendCancelScheduled({ scheduleId: item.scheduleId });
    });
    setScheduledQueue([]);
  };

  const handleVolumeChange = (vol: number) => {
    AudioEngine.getInstance().setVolume(vol);
    setVolume(vol);
    realtimeRef.current?.sendVolumeChange({ volume: vol, isMuted });
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    AudioEngine.getInstance().setMuted(nextMuted);
    setIsMuted(nextMuted);
    realtimeRef.current?.sendVolumeChange({ volume, isMuted: nextMuted });
  };

  const handlePlaybackModeChange = (mode: PlaybackMode) => {
    AudioEngine.getInstance().setPlaybackMode(mode);
    setPlaybackMode(mode);
  };

  const handleAddSound = (newSound: Sound) => {
    const updated = [...sounds, newSound];
    setSounds(updated);
    realtimeRef.current?.sendSoundboardSync({ sounds: updated, categories });
  };

  const handleDeleteSound = (soundId: string) => {
    const updated = sounds.filter((s) => s.id !== soundId);
    setSounds(updated);
    realtimeRef.current?.sendSoundboardSync({ sounds: updated, categories });
  };

  const handleRenameSound = (soundId: string, newName: string) => {
    const updated = sounds.map((s) => (s.id === soundId ? { ...s, name: newName } : s));
    setSounds(updated);
    realtimeRef.current?.sendSoundboardSync({ sounds: updated, categories });
  };

  const handleImportSounds = (importedSounds: Sound[], importedCategories: Category[]) => {
    setSounds(importedSounds);
    setCategories(importedCategories);
    realtimeRef.current?.sendSoundboardSync({
      sounds: importedSounds,
      categories: importedCategories,
    });
  };

  const handleResetDefaults = async () => {
    const defaults = await getDefaultSounds(roomId);
    setSounds(defaults);
    setCategories(DEFAULT_CATEGORIES);
    realtimeRef.current?.sendSoundboardSync({
      sounds: defaults,
      categories: DEFAULT_CATEGORIES,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Autoplay Unlock Notice */}
      {needsAudioUnlock && (
        <div
          onClick={() => {
            AudioEngine.getInstance().resume();
            setNeedsAudioUnlock(false);
          }}
          className="bg-accent/20 border-b border-accent/40 text-accent px-4 py-2.5 text-center text-xs font-bold cursor-pointer hover:bg-accent/30 transition-colors animate-pulse flex items-center justify-center gap-2"
        >
          <Volume2 className="w-4 h-4" />
          <span>Click anywhere on this computer screen to enable audio output!</span>
        </div>
      )}

      <HostHeader
        roomId={roomId}
        devices={devices}
        volume={volume}
        isMuted={isMuted}
        playbackMode={playbackMode}
        scheduledCount={scheduledQueue.length}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        onPlaybackModeChange={handlePlaybackModeChange}
        onStopAll={handleStopAll}
        onOpenQRCode={() => setShowQRModal(true)}
        onOpenManager={() => setShowManagerModal(true)}
        onOpenInstallGuide={() => setShowInstallGuide(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Audio Visualizer */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
            <span>Audio Output Level</span>
            <span>Room {roomId}</span>
          </div>
          <AudioVisualizer />
        </div>

        {/* DELAYED PLAYBACK CONTROLS (Presets: 0s, 3s, 5s, 10s, 15s + Custom) */}
        <DelaySelector
          selectedDelay={selectedDelay}
          onSelectDelay={setSelectedDelay}
        />

        {/* SCHEDULED PLAYBACK QUEUE WITH COUNTDOWN INDICATORS */}
        {scheduledQueue.length > 0 && (
          <ScheduledQueue
            queue={scheduledQueue}
            onCancel={handleCancelScheduled}
            onCancelAll={handleCancelAllScheduled}
          />
        )}

        {/* Soundboard Grid */}
        <div className="pt-1">
          <SoundGrid
            sounds={sounds}
            categories={categories}
            activeSoundIds={activeSoundIds}
            onPlaySound={handlePlaySound}
            onStopSound={handleStopSound}
            onDeleteSound={handleDeleteSound}
            onRenameSound={handleRenameSound}
            onOpenAddModal={() => setShowManagerModal(true)}
            isController={false}
          />
        </div>
      </main>

      <QRCodeModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} roomId={roomId} />

      <SoundboardManagerModal
        isOpen={showManagerModal}
        onClose={() => setShowManagerModal(false)}
        roomId={roomId}
        sounds={sounds}
        categories={categories}
        onAddSound={handleAddSound}
        onImportSounds={handleImportSounds}
        onResetDefaults={handleResetDefaults}
      />

      <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
    </div>
  );
}
