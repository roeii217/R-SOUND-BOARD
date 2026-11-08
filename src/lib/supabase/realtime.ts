import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from './client';
import {
  PlaySoundMessage,
  StopSoundMessage,
  VolumeMessage,
  SoundboardSyncMessage,
  PTTSignalMessage,
  PTTStateMessage,
  DevicePresence,
} from '../types/soundboard';

export interface RoomEventHandlers {
  onPlaySound?: (msg: PlaySoundMessage) => void;
  onStopSound?: (msg: StopSoundMessage) => void;
  onVolumeChange?: (msg: VolumeMessage) => void;
  onSoundboardSync?: (msg: SoundboardSyncMessage) => void;
  onPTTSignal?: (msg: PTTSignalMessage) => void;
  onPTTState?: (msg: PTTStateMessage) => void;
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

  constructor(roomId: string, device: DevicePresence, handlers: RoomEventHandlers) {
    this.roomId = roomId;
    this.device = device;
    this.handlers = handlers;
  }

  public connect(): void {
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

    // 2. Setup Server-Sent Events (SSE) for cross-device LAN / Cloud communication
    if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
      try {
        const streamUrl = `/api/realtime/stream?roomId=${encodeURIComponent(this.roomId)}&deviceId=${encodeURIComponent(
          this.device.id
        )}`;
        this.sseEventSource = new EventSource(streamUrl);

        this.sseEventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.senderId === this.device.id) return;
            this.handleIncomingEvent(data.type, data.payload);
          } catch (e) {
            console.warn('SSE message parse error:', e);
          }
        };

        this.sseEventSource.onerror = (e) => {
          console.warn('SSE connection state/error:', e);
        };
      } catch (e) {
        console.warn('SSE not initialized:', e);
      }
    }

    // 3. Setup Supabase Realtime if configured
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
  }

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
      case 'presence:join': {
        const d = payload as DevicePresence;
        if (d && d.id) {
          this.activeDevices.set(d.id, d);
          this.emitPresenceUpdate();
          // Reply with self presence so the newly joined device knows about us immediately!
          this.broadcastBoth('presence:reply', this.device);
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

  public disconnect(): void {
    this.broadcastBoth('presence:leave', { id: this.device.id });

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
