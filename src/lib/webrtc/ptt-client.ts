import { PTTSignalMessage, PTTStateMessage, PTTAudioChunkMessage } from '../types/soundboard';
import { AudioEngine } from '../audio/audio-engine';

export interface PTTClientOptions {
  peerId: string;
  isHost: boolean;
  sendSignal: (msg: PTTSignalMessage) => void;
  sendState: (msg: PTTStateMessage) => void;
  sendAudioChunk?: (msg: PTTAudioChunkMessage) => void;
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

function getSupportedRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export class PTTClient {
  private peerId: string;
  private isHost: boolean;
  private sendSignal: (msg: PTTSignalMessage) => void;
  private sendState: (msg: PTTStateMessage) => void;
  private sendAudioChunk?: (msg: PTTAudioChunkMessage) => void;
  private onRemoteTrack?: (stream: MediaStream) => void;
  private onTalkingStateChange?: (isTalking: boolean, peerId: string) => void;
  private onError?: (err: Error) => void;

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private audioTrack: MediaStreamTrack | null = null;
  private chunkRecorder: MediaRecorder | null = null;
  private chunkSeq: number = 0;
  private isTalking: boolean = false;
  private isInitialized: boolean = false;
  private isMicReadyState: boolean = false;

  constructor(options: PTTClientOptions) {
    this.peerId = options.peerId;
    this.isHost = options.isHost;
    this.sendSignal = options.sendSignal;
    this.sendState = options.sendState;
    this.sendAudioChunk = options.sendAudioChunk;
    this.onRemoteTrack = options.onRemoteTrack;
    this.onTalkingStateChange = options.onTalkingStateChange;
    this.onError = options.onError;
  }

  public async enableMicrophone(): Promise<boolean> {
    if (this.isMicReadyState && this.localStream) return true;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone not supported in this browser.');
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioTrack = this.localStream.getAudioTracks()[0] || null;
      if (this.audioTrack) {
        this.audioTrack.enabled = false;
      }

      this.isMicReadyState = true;
      this.initControllerRTC();
      return true;
    } catch (err) {
      console.warn('Microphone permission error:', err);
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  public isMicReady(): boolean {
    return this.isMicReadyState && this.localStream !== null;
  }

  private async initControllerRTC(): Promise<void> {
    if (this.isInitialized || this.isHost || !this.localStream) return;

    try {
      this.createPeerConnection();

      if (this.audioTrack && this.pc) {
        this.pc.addTrack(this.audioTrack, this.localStream);
      }

      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);

      this.sendSignal({
        senderId: this.peerId,
        type: 'offer',
        sdp: offer,
      });

      this.isInitialized = true;
    } catch (err) {
      console.warn('WebRTC P2P init warning (SSE chunk fallback will handle voice):', err);
    }
  }

  public initHost(): void {
    if (this.isInitialized || !this.isHost) return;
    this.createPeerConnection();
    this.isInitialized = true;
  }

  private createPeerConnection(): void {
    if (typeof RTCPeerConnection === 'undefined') return;

    try {
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
    } catch (e) {
      console.warn('PeerConnection creation error:', e);
    }
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
      console.warn('WebRTC signaling handle error:', err);
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
  public async startTalking(): Promise<void> {
    if (this.isHost) return;

    if (!this.isMicReadyState) {
      const granted = await this.enableMicrophone();
      if (!granted) return;
    }

    if (this.isTalking) return;
    this.isTalking = true;
    this.chunkSeq = 0;

    // 1. Enable WebRTC audio track
    if (this.audioTrack) {
      this.audioTrack.enabled = true;
    }

    // 2. Vibrate phone
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {}
    }

    // 3. Announce to room that mobile is transmitting
    this.sendState({
      active: true,
      peerId: this.peerId,
    });

    // 4. Start Real-time Audio Chunk Streaming (Fallback that works 100% of the time)
    if (this.localStream && typeof MediaRecorder !== 'undefined') {
      try {
        const mimeType = getSupportedRecorderMimeType();
        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
        const rec = new MediaRecorder(this.localStream, options);
        this.chunkRecorder = rec;

        rec.ondataavailable = async (e) => {
          if (!this.isTalking || !e.data || e.data.size === 0) return;

          try {
            const buffer = await e.data.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);

            this.sendAudioChunk?.({
              peerId: this.peerId,
              chunk: base64,
              mimeType: rec.mimeType || 'audio/webm',
              seq: ++this.chunkSeq,
            });
          } catch (err) {
            console.warn('Error encoding PTT chunk:', err);
          }
        };

        // Slice audio into 150ms packets for low-latency voice streaming
        rec.start(150);
      } catch (err) {
        console.warn('Chunk recorder error:', err);
      }
    }
  }

  /**
   * Called on mobile when user releases Push-to-Talk button
   */
  public stopTalking(): void {
    if (this.isHost || !this.isTalking) return;
    this.isTalking = false;

    // 1. Stop audio chunk recorder
    if (this.chunkRecorder && this.chunkRecorder.state !== 'inactive') {
      try {
        this.chunkRecorder.stop();
      } catch {}
      this.chunkRecorder = null;
    }

    // 2. Mute WebRTC track
    if (this.audioTrack) {
      this.audioTrack.enabled = false;
    }

    // 3. Vibrate phone
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {}
    }

    // 4. Send end transmission state
    this.sendState({
      active: false,
      peerId: this.peerId,
    });
  }

  public getIsTalking(): boolean {
    return this.isTalking;
  }

  public destroy(): void {
    if (this.chunkRecorder && this.chunkRecorder.state !== 'inactive') {
      try {
        this.chunkRecorder.stop();
      } catch {}
    }
    this.chunkRecorder = null;

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
    this.isMicReadyState = false;
  }
}
