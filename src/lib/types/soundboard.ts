export type PlaybackMode = 'polyphonic' | 'restart' | 'solo';

export interface RoomConfig {
  volume: number;
  isMuted: boolean;
  playbackMode: PlaybackMode;
  theme: string;
}

export interface Room {
  id: string;
  name: string;
  createdAt: string;
  config: RoomConfig;
}

export interface Category {
  id: string;
  roomId: string;
  name: string;
  orderIndex: number;
  icon?: string;
}

export interface Sound {
  id: string;
  roomId: string;
  categoryId?: string | null;
  name: string;
  audioUrl: string; // URL, object URL, or data URI
  duration?: number;
  color?: string; // hex or tailwind class
  hotkey?: string;
  orderIndex: number;
  volume?: number; // 0.0 to 1.0 individual trim
  loop?: boolean;
  createdAt?: string;
}

export interface DevicePresence {
  id: string;
  name: string;
  type: 'host' | 'controller';
  joinedAt: number;
  os?: string;
}

export interface PlaySoundMessage {
  soundId: string;
  audioUrl: string;
  name: string;
  volume?: number;
  loop?: boolean;
  playbackMode?: PlaybackMode;
  timestamp: number;
}

export interface StopSoundMessage {
  soundId?: string;
  all?: boolean;
}

export interface VolumeMessage {
  volume: number;
  isMuted: boolean;
}

export interface SoundboardSyncMessage {
  sounds: Sound[];
  categories: Category[];
}

export interface PTTSignalMessage {
  senderId: string;
  targetId?: string;
  type: 'offer' | 'answer' | 'candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface PTTStateMessage {
  active: boolean;
  peerId: string;
  peerName?: string;
}

export interface PTTAudioChunkMessage {
  peerId: string;
  chunk: string; // Base64 audio chunk
  mimeType: string;
  seq: number;
}
