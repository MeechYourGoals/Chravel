/**
 * Scheduled PCM audio playback queue for Gemini Live.
 */

const OUTPUT_SAMPLE_RATE = 24_000;

export class AudioPlaybackQueue {
  private ctx: AudioContext;
  private gainNode: GainNode;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onFirstFramePlayed?: () => void;
  private hasReportedFirstFrame = false;

  constructor(ctx: AudioContext, onFirstFramePlayed?: () => void) {
    this.ctx = ctx;
    this.onFirstFramePlayed = onFirstFramePlayed;
    this.gainNode = ctx.createGain();
    this.gainNode.connect(ctx.destination);
    this.nextStartTime = ctx.currentTime;
  }

  enqueue(base64Audio: string): void {
    if (this.ctx.state === 'closed') return;

    try {
      const pcm16 = base64ToPCM16(base64Audio);
      if (pcm16.length === 0) return;

      const float32 = pcm16ToFloat32(pcm16);
      const buffer = this.ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
      buffer.getChannelData(0).set(float32);

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);

      const startTime = Math.max(this.nextStartTime, this.ctx.currentTime);
      source.start(startTime);
      this.nextStartTime = startTime + buffer.duration;

      if (!this.hasReportedFirstFrame) {
        this.hasReportedFirstFrame = true;
        this.onFirstFramePlayed?.();
      }

      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== source);
      };
    } catch {
      // keep playback alive
    }
  }

  flush(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // noop
      }
    }
    this.activeSources = [];
    this.nextStartTime = this.ctx.currentTime;
  }

  get isPlaying(): boolean {
    return this.activeSources.length > 0;
  }

  destroy(): void {
    this.flush();
    try {
      this.gainNode.disconnect();
    } catch {
      // noop
    }
  }
}

function base64ToPCM16(base64: string): Int16Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }
  return float32;
}
