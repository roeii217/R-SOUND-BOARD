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
  private handlers: RoomEventHandlers = {};
  private activeDevices: Map<string, DevicePresence> = new Map();

  constructor(roomId: string, device: DevicePresence, handlers: RoomEventHandlers) {
    this.roomId = roomId;
    this.device = device;
    this.handlers = handlers;
  }

  public connect(): void {
    const supabase = getSupabase();

    // 1. Setup local browser BroadcastChannel (instant zero-latency fallback)
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this.localBroadcast = new BroadcastChannel(`echoboard_${this.roomId}`);
        this.localBroadcast.onmessage = (event) => {
          const { type, payload, senderId } = event.data || {};
          if (senderId === this.device.id) return; // Ignore own messages
          this.handleIncomingEvent(type, payload);
        };
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }
    }

    // 2. Setup Supabase Realtime if configured
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

    // Broadcast presence join locally
    this.broadcastLocal('presence:join', this.device);
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
        this.activeDevices.set(d.id, d);
        this.emitPresenceUpdate();
        break;
      }
      case 'presence:leave': {
        const id = payload as string;
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

  private broadcastLocal(type: string, payload: unknown): void {
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
  }

  public sendPlaySound(msg: PlaySoundMessage): void {
    this.broadcastLocal('sound:play', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'sound:play',
        payload: msg,
      });
    }
  }

  public sendStopSound(msg: StopSoundMessage): void {
    this.broadcastLocal('sound:stop', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'sound:stop',
        payload: msg,
      });
    }
  }

  public sendVolumeChange(msg: VolumeMessage): void {
    this.broadcastLocal('sound:volume', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'sound:volume',
        payload: msg,
      });
    }
  }

  public sendSoundboardSync(msg: SoundboardSyncMessage): void {
    this.broadcastLocal('soundboard:sync', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'soundboard:sync',
        payload: msg,
      });
    }
  }

  public sendPTTSignal(msg: PTTSignalMessage): void {
    this.broadcastLocal('ptt:signal', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'ptt:signal',
        payload: msg,
      });
    }
  }

  public sendPTTState(msg: PTTStateMessage): void {
    this.broadcastLocal('ptt:state', msg);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'ptt:state',
        payload: msg,
      });
    }
  }

  public disconnect(): void {
    this.broadcastLocal('presence:leave', this.device.id);

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
