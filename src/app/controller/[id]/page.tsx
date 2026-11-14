'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Sound, Category, DevicePresence } from '../../../lib/types/soundboard';
import { RealtimeManager } from '../../../lib/supabase/realtime';
import { PTTClient } from '../../../lib/webrtc/ptt-client';
import { DEFAULT_CATEGORIES, getDefaultSounds } from '../../../lib/presets/default-sounds';
import { ControllerHeader } from '../../../components/controller/ControllerHeader';
import { PushToTalkButton } from '../../../components/controller/PushToTalkButton';
import { SoundGrid } from '../../../components/host/SoundGrid';
import { AddSoundModal } from '../../../components/controller/AddSoundModal';

export default function ControllerScreen() {
  const params = useParams();
  const roomId = (params?.id as string)?.toUpperCase() || 'ECHO-DEFAULT';

  // Room State
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeSoundIds, setActiveSoundIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playOnPhone, setPlayOnPhone] = useState<boolean>(true); // Enabled by default per user request!

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // References
  const realtimeRef = useRef<RealtimeManager | null>(null);
  const [pttClient, setPttClient] = useState<PTTClient | null>(null);
  const localAudioInstancesRef = useRef<HTMLAudioElement[]>([]);

  // 1. Load initial sounds
  useEffect(() => {
    let mounted = true;
    getDefaultSounds(roomId).then((defaultSounds) => {
      if (mounted) {
        setSounds(defaultSounds);
      }
    });
    return () => {
      mounted = false;
    };
  }, [roomId]);

  // 2. Initialize Realtime and WebRTC PTT Client
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

    // Instantiate PTT Client for Mobile
    const ptt = new PTTClient({
      peerId: controllerDeviceId,
      isHost: false,
      sendSignal: (msg) => realtimeRef.current?.sendPTTSignal(msg),
      sendState: (msg) =>
        realtimeRef.current?.sendPTTState({
          ...msg,
          peerName: controllerDevice.name,
        }),
      sendAudioChunk: (msg) => realtimeRef.current?.sendPTTAudioChunk(msg),
    });
    setPttClient(ptt);

    // Instantiate Realtime Manager
    const realtime = new RealtimeManager(roomId, controllerDevice, {
      onPlaySound: (msg) => {
        setActiveSoundIds((prev) => new Set(prev).add(msg.soundId));
        setTimeout(() => {
          setActiveSoundIds((prev) => {
            const next = new Set(prev);
            next.delete(msg.soundId);
            return next;
          });
        }, 1200);
      },

      onStopSound: (msg) => {
        if (msg.all) {
          stopAllLocalAudio();
          setActiveSoundIds(new Set());
        } else if (msg.soundId) {
          setActiveSoundIds((prev) => {
            const next = new Set(prev);
            next.delete(msg.soundId!);
            return next;
          });
        }
      },

      onSoundboardSync: (msg) => {
        if (msg.sounds && msg.sounds.length > 0) {
          setSounds(msg.sounds);
        }
        if (msg.categories && msg.categories.length > 0) {
          setCategories(msg.categories);
        }
      },

      onPTTSignal: (signal) => {
        ptt.handleSignal(signal);
      },

      onPresenceChange: (devs) => {
        const hasHost = devs.some((d) => d.type === 'host');
        setIsConnected(hasHost || devs.length > 1);
      },
    });

    realtime.connect();
    realtimeRef.current = realtime;

    return () => {
      ptt.destroy();
      realtime.disconnect();
      stopAllLocalAudio();
    };
  }, [roomId]);

  const playLocalAudio = (url: string, volume: number = 1.0) => {
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume));
      localAudioInstancesRef.current.push(audio);
      audio.onended = () => {
        localAudioInstancesRef.current = localAudioInstancesRef.current.filter((a) => a !== audio);
      };
      audio.play().catch((err) => {
        console.warn('Local phone audio playback notice:', err);
      });
    } catch (e) {
      console.warn('Audio construction error:', e);
    }
  };

  const stopAllLocalAudio = () => {
    localAudioInstancesRef.current.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
    });
    localAudioInstancesRef.current = [];
  };

  // Handle Play trigger from phone button
  const handlePlaySound = (sound: Sound) => {
    // 1. Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    // 2. Play on phone if enabled OR if disconnected
    if (playOnPhone || !isConnected) {
      playLocalAudio(sound.audioUrl, sound.volume);
    }

    // 3. Trigger on host computer instantly via Realtime broadcast
    realtimeRef.current?.sendPlaySound({
      soundId: sound.id,
      audioUrl: sound.audioUrl,
      name: sound.name,
      volume: sound.volume,
      loop: sound.loop,
      timestamp: Date.now(),
    });

    // 4. Local visual feedback
    setActiveSoundIds((prev) => new Set(prev).add(sound.id));
    setTimeout(() => {
      setActiveSoundIds((prev) => {
        const next = new Set(prev);
        next.delete(sound.id);
        return next;
      });
    }, (sound.duration || 1.0) * 1000);
  };

  const handleStopSound = (sound: Sound) => {
    realtimeRef.current?.sendStopSound({ soundId: sound.id });
    setActiveSoundIds((prev) => {
      const next = new Set(prev);
      next.delete(sound.id);
      return next;
    });
  };

  const handleStopAll = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(20);
      } catch {}
    }
    stopAllLocalAudio();
    realtimeRef.current?.sendStopSound({ all: true });
    setActiveSoundIds(new Set());
  };

  const handleAddSoundFromMobile = (newSound: Sound) => {
    const updated = [...sounds, newSound];
    setSounds(updated);
    realtimeRef.current?.sendSoundboardSync({ sounds: updated, categories });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between select-none">
      {/* Sleek Minimalist Header */}
      <ControllerHeader
        roomId={roomId}
        isConnected={isConnected}
        playOnPhone={playOnPhone}
        onTogglePlayOnPhone={() => setPlayOnPhone(!playOnPhone)}
        onStopAll={handleStopAll}
        onOpenAddModal={() => setShowAddModal(true)}
      />

      {/* Main Soundboard Content */}
      <main className="flex-1 max-w-md w-full mx-auto p-3 pb-24 space-y-3">
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

      {/* Floating Bottom Push-to-Talk Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <PushToTalkButton pttClient={pttClient} isConnected={isConnected} />
      </div>

      {/* Clean Unified Add Sound Modal */}
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
