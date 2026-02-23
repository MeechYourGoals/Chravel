/**
 * Transport creation for Gemini Live voice — duplex required.
 *
 * Live voice requires true duplex (WebSocket). SSE/HTTP polling cannot
 * support real-time barge-in. This module centralizes transport creation
 * and enforces duplex-only.
 */

import { VOICE_USE_WEBSOCKET_ONLY, VOICE_DIAGNOSTICS_ENABLED } from '@/config/voiceFeatureFlags';

export type TransportType = 'websocket';

export interface CreateWebSocketOptions {
  url: string;
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (event: Event) => void;
}

export interface CreateWebSocketResult {
  socket: WebSocket;
  transportType: TransportType;
}

export class NonDuplexTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonDuplexTransportError';
  }
}

/**
 * Create a WebSocket connection for Gemini Live.
 * Asserts duplex transport; rejects SSE/HTTP (not applicable for Live API).
 */
export function createWebSocketTransport(options: CreateWebSocketOptions): CreateWebSocketResult {
  if (!VOICE_USE_WEBSOCKET_ONLY) {
    throw new NonDuplexTransportError(
      'Voice Live requires WebSocket. VOICE_USE_WEBSOCKET_ONLY must be true.',
    );
  }

  if (typeof WebSocket === 'undefined') {
    throw new NonDuplexTransportError(
      'WebSocket is not available. Voice requires a duplex transport (WebSocket).',
    );
  }

  const url = options.url;
  if (!url || typeof url !== 'string') {
    throw new NonDuplexTransportError('WebSocket URL is required for voice transport.');
  }

  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    throw new NonDuplexTransportError(
      `Voice transport must be WebSocket (ws:// or wss://). Got: ${url.slice(0, 50)}...`,
    );
  }

  const socket = new WebSocket(url);

  if (VOICE_DIAGNOSTICS_ENABLED) {
    socket.addEventListener('open', () => {
      console.log('[voice/transport] WebSocket opened', { url: url.slice(0, 80) });
    });
    socket.addEventListener('close', e => {
      console.log('[voice/transport] WebSocket closed', {
        code: e.code,
        reason: e.reason,
        wasClean: e.wasClean,
      });
    });
  }

  if (options.onOpen) socket.addEventListener('open', options.onOpen);
  if (options.onClose) {
    socket.addEventListener('close', e => options.onClose!(e.code, e.reason));
  }
  if (options.onError) socket.addEventListener('error', options.onError);

  return {
    socket,
    transportType: 'websocket',
  };
}

/**
 * Assert that the given transport is duplex (WebSocket).
 * Call this before any voice operations.
 */
export function assertDuplexTransport(): void {
  if (!VOICE_USE_WEBSOCKET_ONLY) {
    throw new NonDuplexTransportError(
      'Gemini Live voice requires duplex transport (WebSocket). SSE/HTTP polling is not supported.',
    );
  }
}
