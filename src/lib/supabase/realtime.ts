import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from './client';
import {
  PlaySoundMessage,
  StopSoundMessage,
  VolumeMessage,
  SoundboardSyncMessage,
  PTTSignalMessage,
  PTTStateMessage,
  PTTAudioChunkMessage,
  DevicePresence,
} from '../types/soundboard';

export interface RoomEventHandlers {
  onPlaySound?: (msg: PlaySoundMessage) => void;
  onStopSound?: (msg: StopSoundMessage) => void;
  onVolumeChange?: (msg: VolumeMessage) => void;
  onSoundboardSync?: (msg: SoundboardSyncMessage) => void;
  onPTTSignal?: (msg: PTTSignalMessage) => void;
  onPTTState?: (msg: PTTStateMessage) => void;
  onPTTAudioChunk?: (msg: PTTAudioChunkMessage) => void;
  onPresenceChange?: (devices: DevicePresence[]) => void;
}

export class RealtimeManager {
  private roomId: string;
  private device: DevicePresence;
  private channel: RealtimeChannel | null = null;
  private localBroadcast: BroadcastChannel | null = null;
  private sseEventSource: EventSource | null = null;
  private handlers: RoomEventHandlers = {};
  private activeDevices: Map<string, DevicePresence> = new Map();
  private isDestroyed: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(roomId: string, device: DevicePresence, handlers: RoomEventHandlers) {
    this.roomId = roomId;
    this.device = device;
    this.handlers = handlers;
  }

  public connect(): void {
    this.isDestroyed = false;
    const supabase = getSupabase();

    // 1. Setup local browser BroadcastChannel (same-device tabs)
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this.localBroadcast = new BroadcastChannel(`echoboard_${this.roomId}`);
        this.localBroadcast.onmessage = (event) => {
          const { type, payload, senderId } = event.data || {};
          if (senderId === this.device.id) return;
          this.handleIncomingEvent(type, payload);
        };
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }
    }

    // 2. Setup Server-Sent Events (SSE) with Auto-Reconnect
    this.setupSSE();

    // 3. Listen to page visibility changes (phone screen lock / tab switch)
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // 4. Setup Supabase Realtime if configured
    if (supabase && isSupabaseConfigured()) {
      this.channel = supabase.channel(`room:${this.roomId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: this.device.id },
        },
      });

      this.channel
        .on('broadcast', { event: 'sound:play' }, ({ payload }) => this.handlers.onPlaySound?.(payload))
        .on('broadcast', { event: 'sound:stop' }, ({ payload }) => this.handlers.onStopSound?.(payload))
        .on('broadcast', { event: 'sound:volume' }, ({ payload }) => this.handlers.onVolumeChange?.(payload))
        .on('broadcast', { event: 'soundboard:sync' }, ({ payload }) => this.handlers.onSoundboardSync?.(payload))
        .on('broadcast', { event: 'ptt:signal' }, ({ payload }) => this.handlers.onPTTSignal?.(payload))
        .on('broadcast', { event: 'ptt:state' }, ({ payload }) => this.handlers.onPTTState?.(payload))
        .on('broadcast', { event: 'ptt:chunk' }, ({ payload }) => this.handlers.onPTTAudioChunk?.(payload))
        .on('presence', { event: 'sync' }, () => {
          if (!this.channel) return;
          const state = this.channel.presenceState<{ device: DevicePresence }>();
          const devices: DevicePresence[] = [];
          Object.values(state).forEach((presences) => {
            presences.forEach((p) => {
              if (p.device) devices.push(p.device);
            });
          });
          this.handlers.onPresenceChange?.(devices);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && this.channel) {
            await this.channel.track({ device: this.device });
          }
        });
    }

    // Register self in active devices
    this.activeDevices.set(this.device.id, this.device);
    this.emitPresenceUpdate();

    // Broadcast presence join to other peers
    this.broadcastBoth('presence:join', this.device);

    // Periodic heartbeat presence broadcast every 8 seconds so connection never drops
    this.heartbeatTimer = setInterval(() => {
      if (this.isDestroyed) return;
      this.broadcastBoth('presence:join', this.device);
    }, 8000);
  }

  private setupSSE(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined' || this.isDestroyed) return;

    if (this.sseEventSource) {
      try {
        this.sseEventSource.close();
      } catch {}
    }

    try {
      const streamUrl = `/api/realtime/stream?roomId=${encodeURIComponent(this.roomId)}&deviceId=${encodeURIComponent(
        this.device.id
      )}`;
      this.sseEventSource = new EventSource(streamUrl);

      this.sseEventSource.onopen = () => {
        // Re-announce presence on open/reconnect
        this.broadcastBoth('presence:join', this.device);
      };

      this.sseEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.senderId === this.device.id) return;
          this.handleIncomingEvent(data.type, data.payload);
        } catch {
          // Keepalive or comment line, ignore
        }
      };

      this.sseEventSource.onerror = () => {
        if (this.isDestroyed) return;
        // Schedule auto-reconnect if dropped
        if (this.sseEventSource) {
          this.sseEventSource.close();
          this.sseEventSource = null;
        }
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.setupSSE();
          }, 1500);
        }
      };
    } catch (e) {
      console.warn('SSE initialization error:', e);
    }
  }

  private handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      if (!this.sseEventSource || this.sseEventSource.readyState === EventSource.CLOSED) {
        this.setupSSE();
      } else {
        this.broadcastBoth('presence:join', this.device);
      }
    }
  };

  private handleIncomingEvent(type: string, payload: unknown): void {
    switch (type) {
      case 'sound:play':
        this.handlers.onPlaySound?.(payload as PlaySoundMessage);
        break;
      case 'sound:stop':
        this.handlers.onStopSound?.(payload as StopSoundMessage);
        break;
      case 'sound:volume':
        this.handlers.onVolumeChange?.(payload as VolumeMessage);
        break;
      case 'soundboard:sync':
        this.handlers.onSoundboardSync?.(payload as SoundboardSyncMessage);
        break;
      case 'ptt:signal':
        this.handlers.onPTTSignal?.(payload as PTTSignalMessage);
        break;
      case 'ptt:state':
        this.handlers.onPTTState?.(payload as PTTStateMessage);
        break;
      case 'ptt:chunk':
        this.handlers.onPTTAudioChunk?.(payload as PTTAudioChunkMessage);
        break;
      case 'presence:join': {
        const d = payload as DevicePresence;
        if (d && d.id) {
          const wasPresent = this.activeDevices.has(d.id);
          this.activeDevices.set(d.id, d);
          this.emitPresenceUpdate();
          if (!wasPresent) {
            this.broadcastBoth('presence:reply', this.device);
          }
        }
        break;
      }
      case 'presence:reply': {
        const d = payload as DevicePresence;
        if (d && d.id) {
          this.activeDevices.set(d.id, d);
          this.emitPresenceUpdate();
        }
        break;
      }
      case 'presence:leave': {
        const id = (typeof payload === 'object' && payload !== null && 'id' in payload)
          ? (payload as { id: string }).id
          : String(payload);
        this.activeDevices.delete(id);
        this.emitPresenceUpdate();
        break;
      }
    }
  }

  private emitPresenceUpdate(): void {
    if (this.handlers.onPresenceChange) {
      this.handlers.onPresenceChange(Array.from(this.activeDevices.values()));
    }
  }

  private broadcastBoth(type: string, payload: unknown): void {
    // 1. BroadcastChannel (local tabs on same browser)
    if (this.localBroadcast) {
      try {
        this.localBroadcast.postMessage({
          type,
          payload,
          senderId: this.device.id,
        });
      } catch (e) {
        console.warn('Local broadcast post error:', e);
      }
    }

    // 2. HTTP Server Relay (cross-device over Wi-Fi / internet)
    if (typeof window !== 'undefined') {
      fetch('/api/realtime/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          type,
          payload,
          senderId: this.device.id,
        }),
      }).catch((e) => {
        console.warn('Relay broadcast fetch error:', e);
      });
    }
  }

  public sendPlaySound(msg: PlaySoundMessage): void {
    this.broadcastBoth('sound:play', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'sound:play',
        payload: msg,
      });
    }
  }

  public sendStopSound(msg: StopSoundMessage): void {
    this.broadcastBoth('sound:stop', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'sound:stop',
        payload: msg,
      });
    }
  }

  public sendVolumeChange(msg: VolumeMessage): void {
    this.broadcastBoth('sound:volume', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'sound:volume',
        payload: msg,
      });
    }
  }

  public sendSoundboardSync(msg: SoundboardSyncMessage): void {
    this.broadcastBoth('soundboard:sync', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'soundboard:sync',
        payload: msg,
      });
    }
  }

  public sendPTTSignal(msg: PTTSignalMessage): void {
    this.broadcastBoth('ptt:signal', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'ptt:signal',
        payload: msg,
      });
    }
  }

  public sendPTTState(msg: PTTStateMessage): void {
    this.broadcastBoth('ptt:state', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'ptt:state',
        payload: msg,
      });
    }
  }

  public sendPTTAudioChunk(msg: PTTAudioChunkMessage): void {
    this.broadcastBoth('ptt:chunk', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'ptt:chunk',
        payload: msg,
      });
    }
  }

  public disconnect(): void {
    this.isDestroyed = true;
    this.broadcastBoth('presence:leave', { id: this.device.id });

    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.sseEventSource) {
      this.sseEventSource.close();
      this.sseEventSource = null;
    }

    if (this.localBroadcast) {
      this.localBroadcast.close();
      this.localBroadcast = null;
    }

    if (this.channel) {
      const supabase = getSupabase();
      if (supabase) {
        supabase.removeChannel(this.channel);
      }
      this.channel = null;
    }
  }
}
