import { PTTSignalMessage, PTTStateMessage } from '../types/soundboard';
import { AudioEngine } from '../audio/audio-engine';

export interface PTTClientOptions {
  peerId: string;
  isHost: boolean;
  sendSignal: (msg: PTTSignalMessage) => void;
  sendState: (msg: PTTStateMessage) => void;
  onRemoteTrack?: (stream: MediaStream) => void;
  onTalkingStateChange?: (isTalking: boolean, peerId: string) => void;
  onError?: (err: Error) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export class PTTClient {
  private peerId: string;
  private isHost: boolean;
  private sendSignal: (msg: PTTSignalMessage) => void;
  private sendState: (msg: PTTStateMessage) => void;
  private onRemoteTrack?: (stream: MediaStream) => void;
  private onTalkingStateChange?: (isTalking: boolean, peerId: string) => void;
  private onError?: (err: Error) => void;

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private audioTrack: MediaStreamTrack | null = null;
  private isTalking: boolean = false;
  private isInitialized: boolean = false;

  constructor(options: PTTClientOptions) {
    this.peerId = options.peerId;
    this.isHost = options.isHost;
    this.sendSignal = options.sendSignal;
    this.sendState = options.sendState;
    this.onRemoteTrack = options.onRemoteTrack;
    this.onTalkingStateChange = options.onTalkingStateChange;
    this.onError = options.onError;
  }

  public async initController(): Promise<void> {
    if (this.isInitialized || this.isHost) return;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioTrack = this.localStream.getAudioTracks()[0] || null;
      if (this.audioTrack) {
        this.audioTrack.enabled = false; // Muted by default until PTT pressed
      }

      this.createPeerConnection();

      if (this.audioTrack && this.pc) {
        this.pc.addTrack(this.audioTrack, this.localStream);
      }

      // Controller initiates the WebRTC offer
      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);

      this.sendSignal({
        senderId: this.peerId,
        type: 'offer',
        sdp: offer,
      });

      this.isInitialized = true;
    } catch (err: unknown) {
      console.warn('Microphone permission or WebRTC error:', err);
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  public initHost(): void {
    if (this.isInitialized || !this.isHost) return;
    this.createPeerConnection();
    this.isInitialized = true;
  }

  private createPeerConnection(): void {
    if (typeof RTCPeerConnection === 'undefined') return;

    this.pc = new RTCPeerConnection(ICE_SERVERS);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          senderId: this.peerId,
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    if (this.isHost) {
      this.pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          AudioEngine.getInstance().attachPTTStream(remoteStream);
          this.onRemoteTrack?.(remoteStream);
        }
      };
    }

    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === 'failed' || this.pc?.connectionState === 'disconnected') {
        console.warn('WebRTC connection state:', this.pc.connectionState);
      }
    };
  }

  public async handleSignal(signal: PTTSignalMessage): Promise<void> {
    if (!this.pc) {
      this.createPeerConnection();
    }
    if (!this.pc) return;

    try {
      if (signal.type === 'offer' && this.isHost) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp!));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        this.sendSignal({
          senderId: this.peerId,
          targetId: signal.senderId,
          type: 'answer',
          sdp: answer,
        });
      } else if (signal.type === 'answer' && !this.isHost) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp!));
      } else if (signal.type === 'candidate' && signal.candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.warn('Error handling WebRTC signal:', err);
    }
  }

  public handleStateMessage(msg: PTTStateMessage): void {
    if (this.onTalkingStateChange) {
      this.onTalkingStateChange(msg.active, msg.peerId);
    }
  }

  /**
   * Called on mobile when user presses and holds Push-to-Talk button
   */
  public startTalking(): void {
    if (this.isHost) return;

    if (!this.isInitialized) {
      this.initController().then(() => this.doStartTalking());
    } else {
      this.doStartTalking();
    }
  }

  private doStartTalking(): void {
    if (this.isTalking) return;
    this.isTalking = true;

    if (this.audioTrack) {
      this.audioTrack.enabled = true;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {}
    }

    this.sendState({
      active: true,
      peerId: this.peerId,
    });
  }

  /**
   * Called on mobile when user releases Push-to-Talk button
   */
  public stopTalking(): void {
    if (this.isHost || !this.isTalking) return;
    this.isTalking = false;

    if (this.audioTrack) {
      this.audioTrack.enabled = false;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {}
    }

    this.sendState({
      active: false,
      peerId: this.peerId,
    });
  }

  public getIsTalking(): boolean {
    return this.isTalking;
  }

  public destroy(): void {
    if (this.audioTrack) {
      this.audioTrack.stop();
      this.audioTrack = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.isHost) {
      AudioEngine.getInstance().detachPTTStream();
    }
    this.isInitialized = false;
  }
}
