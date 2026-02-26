import { vi } from 'vitest';

export const useWebSpeechVoice = vi.fn().mockImplementation(() => ({
  voiceState: 'idle',
  userTranscript: '',
  assistantTranscript: '',
  errorMessage: null,
  debugInfo: {},
  startVoice: vi.fn(),
  stopVoice: vi.fn(),
  toggleVoice: vi.fn(),
}));
