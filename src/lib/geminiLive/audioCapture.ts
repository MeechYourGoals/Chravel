/**
 * Microphone capture → PCM16 16 kHz mono for Gemini Live.
 *
 * Uses ScriptProcessorNode (widely supported) with downsampling from the
 * device's native sample rate to 16 kHz. Output is base64-encoded little-endian
 * PCM16, matching the Gemini Live input format (audio/pcm;rate=16000).
 *
 * The downsampling uses simple averaging which is sufficient for speech audio.
 * Chunk size of 4096 samples at 48 kHz ≈ 85 ms, well within the recommended
 * 50–100 ms range for balanced latency/overhead.
 */

const TARGET_SAMPLE_RATE = 16_000;

export interface AudioCaptureHandle {
  stop: () => void;
}

export function startAudioCapture(
  stream: MediaStream,
  audioContext: AudioContext,
  onChunk: (base64PCM: string) => void,
): AudioCaptureHandle {
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (event: AudioProcessingEvent) => {
    const inputData = event.inputBuffer.getChannelData(0);
    const inputSampleRate = audioContext.sampleRate;
    const downsampled = downsampleTo16k(inputData, inputSampleRate);
    const base64 = float32ToPCM16Base64(downsampled);
    onChunk(base64);
  };

  // Route through a zero-gain node to prevent mic audio leaking to speakers.
  // ScriptProcessorNode requires a destination connection to fire onaudioprocess,
  // but we only read the input — we never want the raw mic signal on speakers.
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
        // Already disconnected
      }
      try {
        processor.disconnect();
      } catch {
        // Already disconnected
      }
      try {
        muteNode.disconnect();
      } catch {
        // Already disconnected
      }
    },
  };
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
