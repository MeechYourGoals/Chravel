/**
 * Microphone capture → PCM16 16 kHz mono for Gemini Live.
 *
 * Primary path: AudioWorkletNode (runs in the dedicated audio rendering thread,
 * no main-thread jank, no browser deprecation warnings).
 *
 * Fallback path: ScriptProcessorNode (deprecated but still supported everywhere,
 * used when AudioWorklet is unavailable — e.g. iOS 14.4 and older).
 */

import { assertChunkFraming, AUDIO_CONTRACT } from '@/voice/audioContract';

const TARGET_SAMPLE_RATE = AUDIO_CONTRACT.expectedSampleRateHz;

export interface AudioCaptureHandle {
  stop: () => void;
}

// ---------------------------------------------------------------------------
// AudioWorklet processor — inlined as a blob so we don't need a separate file
// or special Vite ?url import. The worklet runs in the audio rendering thread
// and messages Float32Array chunks to the main thread via its MessagePort.
// Buffer size (2048 frames @ native sample rate) matches the old ScriptProcessor.
// ---------------------------------------------------------------------------
const WORKLET_BUFFER_FRAMES = 2048;

const WORKLET_CODE = `
class PCM16CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    this._bufSize = ${WORKLET_BUFFER_FRAMES};
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) this._buf.push(ch[i]);
    while (this._buf.length >= this._bufSize) {
      const chunk = new Float32Array(this._buf.splice(0, this._bufSize));
      // Transfer the underlying buffer so no copy is made
      this.port.postMessage({ type: 'chunk', data: chunk.buffer }, [chunk.buffer]);
    }
    return true; // Keep processor alive
  }
}
registerProcessor('pcm16-capture-processor', PCM16CaptureProcessor);
`;

let workletBlobUrl: string | null = null;

function getWorkletUrl(): string {
  if (!workletBlobUrl) {
    const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
    workletBlobUrl = URL.createObjectURL(blob);
  }
  return workletBlobUrl;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start microphone capture and emit base64-encoded PCM16 16 kHz chunks.
 *
 * Returns an `AudioCaptureHandle` with a `stop()` method that tears down the
 * audio graph cleanly (no dangling nodes or event listeners).
 */
export async function startAudioCapture(
  stream: MediaStream,
  audioContext: AudioContext,
  onChunk: (base64PCM: string) => void,
  onRms?: (rms: number) => void,
  options?: { diagnosticsEnabled?: boolean },
): Promise<AudioCaptureHandle> {
  const diagnosticsEnabled = options?.diagnosticsEnabled ?? import.meta.env.DEV;

  // Prefer AudioWorklet; fall back to ScriptProcessor for older iOS / Safari.
  const workletSupported = typeof audioContext.audioWorklet?.addModule === 'function';

  if (workletSupported) {
    return startWithWorklet(stream, audioContext, onChunk, onRms, diagnosticsEnabled);
  }
  return startWithScriptProcessor(stream, audioContext, onChunk, onRms, diagnosticsEnabled);
}

// ---------------------------------------------------------------------------
// AudioWorklet path
// ---------------------------------------------------------------------------
async function startWithWorklet(
  stream: MediaStream,
  audioContext: AudioContext,
  onChunk: (base64PCM: string) => void,
  onRms: ((rms: number) => void) | undefined,
  diagnosticsEnabled: boolean,
): Promise<AudioCaptureHandle> {
  await audioContext.audioWorklet.addModule(getWorkletUrl());

  const source = audioContext.createMediaStreamSource(stream);
  const workletNode = new AudioWorkletNode(audioContext, 'pcm16-capture-processor');

  workletNode.port.onmessage = (event: MessageEvent) => {
    if (event.data?.type !== 'chunk') return;
    const float32 = new Float32Array(event.data.data as ArrayBuffer);
    onRms?.(computeRms(float32));
    const inputSampleRate = audioContext.sampleRate;
    const downsampled = downsampleTo16k(float32, inputSampleRate);
    assertChunkFraming(downsampled.length, diagnosticsEnabled);
    onChunk(float32ToPCM16Base64(downsampled));
  };

  // Mute node: prevents feedback loop without disconnecting the graph
  const muteNode = audioContext.createGain();
  muteNode.gain.value = 0;

  source.connect(workletNode);
  workletNode.connect(muteNode);
  muteNode.connect(audioContext.destination);

  return {
    stop: () => {
      workletNode.port.onmessage = null;
      workletNode.port.close();
      try {
        source.disconnect();
      } catch {
        /* noop */
      }
      try {
        workletNode.disconnect();
      } catch {
        /* noop */
      }
      try {
        muteNode.disconnect();
      } catch {
        /* noop */
      }
    },
  };
}

// ---------------------------------------------------------------------------
// ScriptProcessor fallback (deprecated but universally supported)
// ---------------------------------------------------------------------------
function startWithScriptProcessor(
  stream: MediaStream,
  audioContext: AudioContext,
  onChunk: (base64PCM: string) => void,
  onRms: ((rms: number) => void) | undefined,
  diagnosticsEnabled: boolean,
): AudioCaptureHandle {
  const source = audioContext.createMediaStreamSource(stream);

  const processor = audioContext.createScriptProcessor(WORKLET_BUFFER_FRAMES, 1, 1);

  processor.onaudioprocess = (event: AudioProcessingEvent) => {
    const inputData = event.inputBuffer.getChannelData(0);
    onRms?.(computeRms(inputData));
    const inputSampleRate = audioContext.sampleRate;
    const downsampled = downsampleTo16k(inputData, inputSampleRate);
    assertChunkFraming(downsampled.length, diagnosticsEnabled);
    onChunk(float32ToPCM16Base64(downsampled));
  };

  const muteNode = audioContext.createGain();
  muteNode.gain.value = 0;

  source.connect(processor);
  processor.connect(muteNode);
  muteNode.connect(audioContext.destination);

  return {
    stop: () => {
      processor.onaudioprocess = null;
      try {
        source.disconnect();
      } catch {
        /* noop */
      }
      try {
        processor.disconnect();
      } catch {
        /* noop */
      }
      try {
        muteNode.disconnect();
      } catch {
        /* noop */
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Audio utilities
// ---------------------------------------------------------------------------

function computeRms(input: Float32Array): number {
  if (input.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < input.length; i++) {
    sumSquares += input[i] * input[i];
  }
  return Math.sqrt(sumSquares / input.length);
}

function downsampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate <= TARGET_SAMPLE_RATE) return input;

  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += input[j];
    }
    output[i] = end - start > 0 ? sum / (end - start) : 0;
  }

  return output;
}

function float32ToPCM16Base64(float32: Float32Array): string {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const uint8 = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}
