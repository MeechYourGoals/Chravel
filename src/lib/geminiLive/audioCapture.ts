/**
 * Microphone capture → PCM16 16 kHz mono for Gemini Live.
 */

import { assertChunkFraming, AUDIO_CONTRACT } from '@/voice/audioContract';

const TARGET_SAMPLE_RATE = AUDIO_CONTRACT.expectedSampleRateHz;

export interface AudioCaptureHandle {
  stop: () => void;
}

export function startAudioCapture(
  stream: MediaStream,
  audioContext: AudioContext,
  onChunk: (base64PCM: string) => void,
  onRms?: (rms: number) => void,
  options?: { diagnosticsEnabled?: boolean },
): AudioCaptureHandle {
  const diagnosticsEnabled = options?.diagnosticsEnabled ?? import.meta.env.DEV;
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(2048, 1, 1);

  processor.onaudioprocess = (event: AudioProcessingEvent) => {
    const inputData = event.inputBuffer.getChannelData(0);
    onRms?.(computeRms(inputData));
    const inputSampleRate = audioContext.sampleRate;
    const downsampled = downsampleTo16k(inputData, inputSampleRate);
    assertChunkFraming(downsampled.length, diagnosticsEnabled);
    const base64 = float32ToPCM16Base64(downsampled);
    onChunk(base64);
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
        // noop
      }
      try {
        processor.disconnect();
      } catch {
        // noop
      }
      try {
        muteNode.disconnect();
      } catch {
        // noop
      }
    },
  };
}

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
