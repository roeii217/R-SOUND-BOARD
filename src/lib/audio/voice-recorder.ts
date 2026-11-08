export interface RecordingResult {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: string;
}

export type AudioLevelCallback = (level: number) => void;

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private onLevelChange?: AudioLevelCallback;
  private startTime: number = 0;
  private totalPausedDuration: number = 0;
  private pauseStartTime: number = 0;
  private isPausedState: boolean = false;

  public static getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  constructor(onLevelChange?: AudioLevelCallback) {
    this.onLevelChange = onLevelChange;
  }

  public async start(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const mimeType = VoiceRecorder.getSupportedMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.audioChunks = [];
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Setup live audio visualizer/level meter
    this.setupAudioAnalysis(this.stream);

    this.startTime = Date.now();
    this.totalPausedDuration = 0;
    this.isPausedState = false;

    this.mediaRecorder.start(100);
  }

  public pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPausedState = true;
      this.pauseStartTime = Date.now();
      if (this.onLevelChange) this.onLevelChange(0);
    }
  }

  public resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.isPausedState = false;
      this.totalPausedDuration += Date.now() - this.pauseStartTime;
    }
  }

  public isPaused(): boolean {
    return this.isPausedState;
  }

  public isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state !== 'inactive';
  }

  public async stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder is not active.'));
        return;
      }

      this.stopAnalysis();

      const finalDuration = (Date.now() - this.startTime - this.totalPausedDuration) / 1000;

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Stop all mic tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        resolve({
          blob,
          url,
          duration: Math.max(0.1, finalDuration),
          mimeType,
        });
      };

      this.mediaRecorder.stop();
    });
  }

  public cancel(): void {
    this.stopAnalysis();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }

  private setupAudioAnalysis(stream: MediaStream): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtxClass();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkLevel = () => {
        if (!this.analyser || this.isPausedState) {
          this.animFrameId = requestAnimationFrame(checkLevel);
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 128); // 0 to 1

        if (this.onLevelChange) {
          this.onLevelChange(normalized);
        }

        this.animFrameId = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch (e) {
      console.warn('Audio analysis meter initialization failed:', e);
    }
  }

  private stopAnalysis(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.onLevelChange) {
      this.onLevelChange(0);
    }
  }
}
