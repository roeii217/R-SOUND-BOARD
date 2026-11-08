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
import { GalleryUploadModal } from '../../../components/controller/GalleryUploadModal';
import { VoiceRecorderModal } from '../../../components/controller/VoiceRecorderModal';
import { InstallGuideModal } from '../../../components/pwa/InstallGuideModal';

export default function ControllerScreen() {
  const params = useParams();
  const roomId = (params?.id as string)?.toUpperCase() || 'ECHO-DEFAULT';

  // Room State
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeSoundIds, setActiveSoundIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Modals
  const [showGalleryUpload, setShowGalleryUpload] = useState<boolean>(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  // References
  const realtimeRef = useRef<RealtimeManager | null>(null);
  const [pttClient, setPttClient] = useState<PTTClient | null>(null);

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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
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
    };
  }, [roomId]);

  // Handle Play trigger from phone button
  const handlePlaySound = (sound: Sound) => {
    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    // Trigger on host computer instantly via Realtime broadcast
    realtimeRef.current?.sendPlaySound({
      soundId: sound.id,
      audioUrl: sound.audioUrl,
      name: sound.name,
      volume: sound.volume,
      loop: sound.loop,
      timestamp: Date.now(),
    });

    // Local visual feedback
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
    realtimeRef.current?.sendStopSound({ all: true });
    setActiveSoundIds(new Set());
  };

  const handleAddSoundFromMobile = (newSound: Sound) => {
    const updated = [...sounds, newSound];
    setSounds(updated);
    realtimeRef.current?.sendSoundboardSync({ sounds: updated, categories });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between select-none pb-safe">
      {/* Mobile Header */}
      <ControllerHeader
        roomId={roomId}
        isConnected={isConnected}
        onStopAll={handleStopAll}
        onOpenGalleryUpload={() => setShowGalleryUpload(true)}
        onOpenVoiceRecorder={() => setShowVoiceRecorder(true)}
        onOpenInstallGuide={() => setShowInstallGuide(true)}
      />

      {/* Main Controller Content */}
      <main className="flex-1 max-w-md w-full mx-auto p-3 space-y-4">
        {/* Push-to-Talk Wireless Microphone Section */}
        <section className="bg-surface/80 rounded-3xl border border-surface-border p-4 shadow-xl">
          <PushToTalkButton pttClient={pttClient} isConnected={isConnected} />
        </section>

        {/* Soundboard Buttons Section */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 px-1">
            <span>SOUNDBOARD</span>
            <span>Tap to play on computer</span>
          </div>

          <SoundGrid
            sounds={sounds}
            categories={categories}
            activeSoundIds={activeSoundIds}
            onPlaySound={handlePlaySound}
            onStopSound={handleStopSound}
            onOpenAddModal={() => setShowGalleryUpload(true)}
            isController={true}
          />
        </section>
      </main>

      {/* MODALS */}
      <GalleryUploadModal
        isOpen={showGalleryUpload}
        onClose={() => setShowGalleryUpload(false)}
        roomId={roomId}
        categories={categories}
        soundsCount={sounds.length}
        onAddSound={handleAddSoundFromMobile}
      />

      <VoiceRecorderModal
        isOpen={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        roomId={roomId}
        categories={categories}
        soundsCount={sounds.length}
        onAddSound={handleAddSoundFromMobile}
      />

      <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
    </div>
  );
}
