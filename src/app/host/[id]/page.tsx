'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Volume2 } from 'lucide-react';
import { Sound, Category, DevicePresence, PlaybackMode } from '../../../lib/types/soundboard';
import { AudioEngine } from '../../../lib/audio/audio-engine';
import { RealtimeManager } from '../../../lib/supabase/realtime';
import { PTTClient } from '../../../lib/webrtc/ptt-client';
import { DEFAULT_CATEGORIES, getDefaultSounds } from '../../../lib/presets/default-sounds';
import { HostHeader } from '../../../components/host/HostHeader';
import { AudioVisualizer } from '../../../components/host/AudioVisualizer';
import { PushToTalkIndicator } from '../../../components/host/PushToTalkIndicator';
import { SoundGrid } from '../../../components/host/SoundGrid';
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
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState<boolean>(false);

  // Audio Controls State
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('polyphonic');

  // Push-to-Talk State
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [pttSpeakerName, setPttSpeakerName] = useState<string>('Phone Controller');

  // Modals
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [showManagerModal, setShowManagerModal] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  // References
  const realtimeRef = useRef<RealtimeManager | null>(null);
  const pttClientRef = useRef<PTTClient | null>(null);

  // 1. Initialize Default Sounds and Audio Engine
  useEffect(() => {
    let mounted = true;
    getDefaultSounds(roomId).then((defaultSounds) => {
      if (mounted) {
        setSounds(defaultSounds);
      }
    });

    const engine = AudioEngine.getInstance();
    setVolume(engine.getVolume());
    setIsMuted(engine.getIsMuted());
    setPlaybackMode(engine.getPlaybackMode());

    // Check if AudioContext needs user interaction to unlock
    const ctx = engine.init();
    if (ctx.state === 'suspended') {
      setNeedsAudioUnlock(true);
    }

    const unlockAudio = () => {
      engine.resume().then(() => {
        setNeedsAudioUnlock(false);
      });
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      mounted = false;
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [roomId]);

  // 2. Setup Realtime and WebRTC Signaling
  useEffect(() => {
    const hostDeviceId = `host-${Math.random().toString(36).substring(2, 9)}`;
    const hostDevice: DevicePresence = {
      id: hostDeviceId,
      name: 'Computer Host',
      type: 'host',
      joinedAt: Date.now(),
      os: 'Desktop',
    };

    // Instantiate PTT Client for Host
    const pttClient = new PTTClient({
      peerId: hostDeviceId,
      isHost: true,
      sendSignal: (msg) => realtimeRef.current?.sendPTTSignal(msg),
      sendState: (msg) => realtimeRef.current?.sendPTTState(msg),
      onTalkingStateChange: (active) => {
        setIsPTTActive(active);
      },
    });
    pttClient.initHost();
    pttClientRef.current = pttClient;

    // Instantiate Realtime Manager
    const realtime = new RealtimeManager(roomId, hostDevice, {
      onPlaySound: (msg) => {
        const engine = AudioEngine.getInstance();
        engine.play({
          soundId: msg.soundId,
          audioUrl: msg.audioUrl,
          volume: msg.volume,
          loop: msg.loop,
          playbackMode: msg.playbackMode,
        });

        setActiveSoundIds((prev) => new Set(prev).add(msg.soundId));
        setTimeout(() => {
          setActiveSoundIds((prev) => {
            const next = new Set(prev);
            next.delete(msg.soundId);
            return next;
          });
        }, 1200);

        // Confetti feedback
        try {
          confetti({
            particleCount: 25,
            spread: 50,
            origin: { y: 0.9 },
            colors: ['#6366f1', '#10b981', '#06b6d4', '#f97316'],
          });
        } catch {}
      },

      onStopSound: (msg) => {
        const engine = AudioEngine.getInstance();
        if (msg.all) {
          engine.stopAll();
          setActiveSoundIds(new Set());
        } else if (msg.soundId) {
          engine.stop(msg.soundId);
          setActiveSoundIds((prev) => {
            const next = new Set(prev);
            next.delete(msg.soundId!);
            return next;
          });
        }
      },

      onVolumeChange: (msg) => {
        const engine = AudioEngine.getInstance();
        engine.setVolume(msg.volume);
        engine.setMuted(msg.isMuted);
        setVolume(msg.volume);
        setIsMuted(msg.isMuted);
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
        pttClientRef.current?.handleSignal(signal);
      },

      onPTTState: (state) => {
        setIsPTTActive(state.active);
        if (state.peerName) setPttSpeakerName(state.peerName);
        pttClientRef.current?.handleStateMessage(state);
      },

      onPTTAudioChunk: (msg) => {
        // Play incoming PTT audio chunk on host speakers (SSE-relay fallback for voice)
        AudioEngine.getInstance().playPTTChunk(msg.chunk, msg.mimeType);
      },

      onPresenceChange: (devs) => {
        setDevices(devs);
      },
    });

    realtime.connect();
    realtimeRef.current = realtime;

    return () => {
      pttClient.destroy();
      realtime.disconnect();
    };
  }, [roomId]);

  // Audio Playback Handlers
  const handlePlaySound = (sound: Sound) => {
    const engine = AudioEngine.getInstance();
    engine.play({
      soundId: sound.id,
      audioUrl: sound.audioUrl,
      volume: sound.volume,
      loop: sound.loop,
    });

    setActiveSoundIds((prev) => new Set(prev).add(sound.id));
    setTimeout(() => {
      setActiveSoundIds((prev) => {
        const next = new Set(prev);
        next.delete(sound.id);
        return next;
      });
    }, (sound.duration || 1.2) * 1000);
  };

  const handleStopSound = (sound: Sound) => {
    AudioEngine.getInstance().stop(sound.id);
    setActiveSoundIds((prev) => {
      const next = new Set(prev);
      next.delete(sound.id);
      return next;
    });
  };

  const handleStopAll = () => {
    AudioEngine.getInstance().stopAll();
    setActiveSoundIds(new Set());
    realtimeRef.current?.sendStopSound({ all: true });
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

  // Soundboard Customization Handlers
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
      {/* Autoplay Unlock Notice (if browser suspended audio) */}
      {needsAudioUnlock && (
        <div
          onClick={() => {
            AudioEngine.getInstance().resume();
            setNeedsAudioUnlock(false);
          }}
          className="bg-accent/20 border-b border-accent/40 text-accent px-4 py-2.5 text-center text-xs font-bold cursor-pointer hover:bg-accent/30 transition-colors animate-pulse flex items-center justify-center gap-2"
        >
          <Volume2 className="w-4 h-4" />
          <span>Click anywhere on this computer screen to enable computer speaker output!</span>
        </div>
      )}

      {/* Host Header */}
      <HostHeader
        roomId={roomId}
        devices={devices}
        volume={volume}
        isMuted={isMuted}
        playbackMode={playbackMode}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        onPlaybackModeChange={handlePlaybackModeChange}
        onStopAll={handleStopAll}
        onOpenQRCode={() => setShowQRModal(true)}
        onOpenManager={() => setShowManagerModal(true)}
        onOpenInstallGuide={() => setShowInstallGuide(true)}
      />

      {/* Push-to-Talk Live Voice Indicator */}
      <PushToTalkIndicator isReceivingAudio={isPTTActive} speakerName={pttSpeakerName} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Realtime Audio Visualizer Banner */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
            <span>Audio Visualizer &amp; Output Level</span>
            <span>Room {roomId}</span>
          </div>
          <AudioVisualizer />
        </div>

        {/* Soundboard Grid */}
        <div className="pt-2">
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

      {/* Modals */}
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
