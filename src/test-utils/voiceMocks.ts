import { vi } from 'vitest';

/**
 * Mock WebSocket with simulation helpers.
 */
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  // Simulation helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: Record<string, unknown>): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  simulateClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason, wasClean: code === 1000 }));
  }

  simulateError(): void {
    this.onerror?.(new Event('error'));
  }
}

/**
 * Mock AudioContext with basic node graph support.
 */
export function createMockAudioContext(): AudioContext {
  const gainNode = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 },
  };

  return {
    state: 'running' as AudioContextState,
    sampleRate: 48000,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => gainNode),
    createMediaStreamSource: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    destination: {},
    currentTime: 0,
  } as unknown as AudioContext;
}

/**
 * Mock MediaStream with controllable tracks.
 */
export function createMockMediaStream(): MediaStream {
  const track = {
    label: 'Mock Microphone',
    kind: 'audio',
    enabled: true,
    stop: vi.fn(),
    getSettings: vi.fn(() => ({
      channelCount: 1,
      sampleRate: 48000,
      echoCancellation: true,
    })),
  };

  return {
    getAudioTracks: vi.fn(() => [track]),
    getTracks: vi.fn(() => [track]),
  } as unknown as MediaStream;
}

/**
 * Setup navigator.mediaDevices mock.
 */
export function mockGetUserMedia(stream: MediaStream): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(stream),
    },
    writable: true,
    configurable: true,
  });
}

/**
 * Setup navigator.permissions mock.
 */
export function mockPermissions(): void {
  Object.defineProperty(navigator, 'permissions', {
    value: {
      query: vi.fn().mockResolvedValue({ state: 'granted' }),
    },
    writable: true,
    configurable: true,
  });
}
