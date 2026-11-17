import { PlaybackMode } from '../types/soundboard';

interface ActiveSoundInstance {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  soundId: string;
  startTime: number;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private activeSounds: Map<string, ActiveSoundInstance[]> = new Map();
  private fallbackAudios: HTMLAudioElement[] = [];
  private scheduledTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private volume: number = 0.8;
  private isMuted: boolean = false;
  private playbackMode: PlaybackMode = 'polyphonic';
  private pttSourceNode: MediaStreamAudioSourceNode | null = null;
  private pttGainNode: GainNode | null = null;

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private constructor() {
    // Lazy init on first user gesture
  }

  public init(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.75;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  public async resume(): Promise<void> {
    const ctx = this.init();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setPlaybackMode(mode: PlaybackMode): void {
    this.playbackMode = mode;
  }

  public getPlaybackMode(): PlaybackMode {
    return this.playbackMode;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Pre-loads an audio URL into the memory buffer cache for instantaneous playback
   */
  public async preload(soundId: string, url: string): Promise<AudioBuffer | null> {
    if (!url) return null;
    if (this.bufferCache.has(soundId)) {
      return this.bufferCache.get(soundId)!;
    }

    try {
      const ctx = this.init();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.bufferCache.set(soundId, audioBuffer);
      return audioBuffer;
    } catch (err) {
      console.warn(`Failed to preload audio for sound ${soundId}:`, err);
      return null;
    }
  }

  /**
   * Plays a sound using Web Audio API
   */
  public async play(options: {
    soundId: string;
    audioUrl: string;
    volume?: number;
    loop?: boolean;
    playbackMode?: PlaybackMode;
  }): Promise<void> {
    const { soundId, audioUrl, volume = 1.0, loop = false } = options;
    const mode = options.playbackMode || this.playbackMode;

    await this.resume();
    const ctx = this.init();

    // Handle solo mode: stop all playing sounds
    if (mode === 'solo') {
      this.stopAll();
    } else if (mode === 'restart') {
      this.stop(soundId);
    }

    // Retrieve or fetch AudioBuffer
    let buffer = this.bufferCache.get(soundId);
    if (!buffer && audioUrl) {
      buffer = (await this.preload(soundId, audioUrl)) || undefined;
    }

    if (!buffer) {
      // Fallback: standard HTML5 Audio element if decode failed
      this.playFallbackAudio(audioUrl, volume, loop);
      return;
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;

      const soundGain = ctx.createGain();
      soundGain.gain.setValueAtTime(volume, ctx.currentTime);

      source.connect(soundGain);
      soundGain.connect(this.masterGain!);

      const instance: ActiveSoundInstance = {
        source,
        gainNode: soundGain,
        soundId,
        startTime: ctx.currentTime,
      };

      const currentList = this.activeSounds.get(soundId) || [];
      currentList.push(instance);
      this.activeSounds.set(soundId, currentList);

      source.onended = () => {
        const list = this.activeSounds.get(soundId);
        if (list) {
          const filtered = list.filter((item) => item !== instance);
          if (filtered.length > 0) {
            this.activeSounds.set(soundId, filtered);
          } else {
            this.activeSounds.delete(soundId);
          }
        }
      };

      source.start(0);
    } catch {
      this.playFallbackAudio(audioUrl, volume, loop);
    }
  }

  private playFallbackAudio(url: string, volume: number, loop: boolean): void {
    try {
      const audio = new Audio(url);
      audio.volume = this.isMuted ? 0 : this.volume * volume;
      audio.loop = loop;
      this.fallbackAudios.push(audio);
      audio.onended = () => {
        this.fallbackAudios = this.fallbackAudios.filter((a) => a !== audio);
      };
      audio.play().catch((e) => console.warn('HTML Audio play error:', e));
    } catch (e) {
      console.warn('Fallback audio failed:', e);
    }
  }

  public stop(soundId: string): void {
    const instances = this.activeSounds.get(soundId);
    if (instances) {
      instances.forEach((inst) => {
        try {
          inst.source.stop(0);
          inst.source.disconnect();
        } catch {
          // Ignore already stopped
        }
      });
      this.activeSounds.delete(soundId);
    }
  }

  public stopAll(): void {
    // 1. Cancel all scheduled (delayed) sounds
    this.scheduledTimeouts.forEach((handle) => clearTimeout(handle));
    this.scheduledTimeouts.clear();

    // 2. Stop all Web Audio buffer sources
    this.activeSounds.forEach((instances) => {
      instances.forEach((inst) => {
        try {
          inst.source.stop(0);
          inst.source.disconnect();
        } catch {
          // Ignore
        }
      });
    });
    this.activeSounds.clear();

    // 3. Stop all fallback HTML5 audio elements
    this.fallbackAudios.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
    });
    this.fallbackAudios = [];

    // 4. Immediately cut master gain to 0 to eliminate any reverb/tail/delay
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      setTimeout(() => {
        if (this.masterGain && this.ctx && !this.isMuted) {
          this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
      }, 60);
    }
  }

  /**
   * Schedule a sound to play after a delay (in ms).
   * Returns the scheduleId for cancellation.
   */
  public schedulePlay(options: {
    scheduleId: string;
    delayMs: number;
    soundId: string;
    audioUrl: string;
    volume?: number;
    loop?: boolean;
    playbackMode?: PlaybackMode;
    onPlay?: () => void;
  }): void {
    const { scheduleId, delayMs } = options;
    // Cancel any existing schedule with same id
    this.cancelScheduled(scheduleId);

    const handle = setTimeout(() => {
      this.scheduledTimeouts.delete(scheduleId);
      options.onPlay?.();
      this.play({
        soundId: options.soundId,
        audioUrl: options.audioUrl,
        volume: options.volume,
        loop: options.loop,
        playbackMode: options.playbackMode,
      });
    }, delayMs);

    this.scheduledTimeouts.set(scheduleId, handle);
  }

  public cancelScheduled(scheduleId: string): boolean {
    const handle = this.scheduledTimeouts.get(scheduleId);
    if (handle !== undefined) {
      clearTimeout(handle);
      this.scheduledTimeouts.delete(scheduleId);
      return true;
    }
    return false;
  }

  public cancelAllScheduled(): void {
    this.scheduledTimeouts.forEach((handle) => clearTimeout(handle));
    this.scheduledTimeouts.clear();
  }

  public getScheduledCount(): number {
    return this.scheduledTimeouts.size;
  }

  public isPlaying(soundId: string): boolean {
    return (this.activeSounds.get(soundId)?.length || 0) > 0;
  }

  /**
   * Connects incoming Push-to-Talk WebRTC stream directly to master output & visualizer
   */
  public attachPTTStream(stream: MediaStream): void {
    try {
      this.init();
      if (!this.ctx || !this.masterGain) return;

      this.detachPTTStream();

      this.pttSourceNode = this.ctx.createMediaStreamSource(stream);
      this.pttGainNode = this.ctx.createGain();
      this.pttGainNode.gain.setValueAtTime(1.4, this.ctx.currentTime); // Voice boost

      this.pttSourceNode.connect(this.pttGainNode);
      this.pttGainNode.connect(this.masterGain);
    } catch (e) {
      console.warn('Failed to attach PTT stream to audio graph:', e);
    }
  }

  public detachPTTStream(): void {
    if (this.pttSourceNode) {
      try {
        this.pttSourceNode.disconnect();
      } catch {}
      this.pttSourceNode = null;
    }
    if (this.pttGainNode) {
      try {
        this.pttGainNode.disconnect();
      } catch {}
      this.pttGainNode = null;
    }
  }

  /**
   * Plays an incoming wireless mic audio chunk (guaranteed fallback that works anywhere)
   */
  public async playPTTChunk(base64Data: string, mimeType: string = 'audio/webm'): Promise<void> {
    try {
      this.init();
      if (!this.ctx || !this.masterGain) return;
      await this.resume();

      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      try {
        const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer.slice(0));
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;
        const voiceGain = this.ctx.createGain();
        voiceGain.gain.setValueAtTime(1.4, this.ctx.currentTime);
        source.connect(voiceGain);
        voiceGain.connect(this.masterGain);
        source.start(0);
      } catch {
        // Fallback to HTML5 audio element
        const blob = new Blob([bytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = this.isMuted ? 0 : this.volume;
        audio.onended = () => URL.revokeObjectURL(url);
        audio.play().catch(() => URL.revokeObjectURL(url));
      }
    } catch (e) {
      console.warn('PTT chunk playback error:', e);
    }
  }
}
