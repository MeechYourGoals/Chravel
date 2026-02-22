/**
 * Scheduled PCM audio playback queue for Gemini Live.
 *
 * Gemini Live outputs 24 kHz mono PCM16 audio. This queue converts incoming
 * base64-encoded PCM16 chunks into AudioBufferSourceNodes and schedules them
 * back-to-back on an AudioContext so playback is gap-free and stutter-free.
 *
 * Key design decisions:
 * - Uses AudioContext.currentTime scheduling to prevent gaps between chunks
 * - Tracks all active source nodes so flush() can stop them instantly (barge-in)
 * - Uses a GainNode for potential volume control and clean disconnection
 */

const OUTPUT_SAMPLE_RATE = 24_000;

export class AudioPlaybackQueue {
  private ctx: AudioContext;
  private gainNode: GainNode;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.gainNode = ctx.createGain();
    this.gainNode.connect(ctx.destination);
    this.nextStartTime = ctx.currentTime;
  }

  /**
   * Decode a base64-encoded PCM16 chunk and schedule it for seamless playback.
   */
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

      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== source);
      };
    } catch {
      // Silently skip malformed chunks to keep playback going
    }
  }

  /**
   * Immediately stop all playing and scheduled audio. Used for barge-in
   * interruption and session cleanup.
   */
  flush(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // Source may have already ended
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
      // Already disconnected
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
