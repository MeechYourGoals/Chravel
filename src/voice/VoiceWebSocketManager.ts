/**
 * VoiceWebSocketManager — manages the WebSocket connection to Vertex AI.
 *
 * Handles: connection lifecycle, keepalive, message parsing, setup timeout.
 * Dispatches parsed messages to typed callbacks. Does NOT own state machine,
 * audio, or turn accumulators — those stay in useGeminiLive.
 *
 * Extracted from useGeminiLive to reduce hook complexity and improve testability.
 */

import {
  WEBSOCKET_SETUP_TIMEOUT_MS,
  WS_KEEPALIVE_INTERVAL_MS,
  LIVE_INPUT_MIME,
  SILENT_KEEPALIVE_FRAME,
  voiceLog,
  mapSessionError,
  mapWsCloseError,
} from '@/voice/liveConstants';

// ── Parsed message types ──

export interface WsServerError {
  code?: number;
  message: string;
  userMessage: string;
}

export interface WsGoAway {
  timeLeft?: string;
  resumptionToken?: string;
}

export interface WsResumptionUpdate {
  token: string;
}

export interface WsModelPart {
  audioData?: string;
  text?: string;
  mimeType?: string;
}

export interface WsInputTranscript {
  text: string;
}

export interface WsOutputTranscript {
  text: string;
}

export interface WsToolCallData {
  functionCalls: Array<{ id: string; name: string; args?: Record<string, unknown> }>;
}

// ── Callback interface ──

export interface VoiceWsCallbacks {
  onSetupComplete: () => void;
  onServerError: (err: WsServerError) => void;
  onGoAway: (data: WsGoAway) => void;
  onResumptionUpdate: (data: WsResumptionUpdate) => void;
  onInterrupted: () => void;
  onModelParts: (parts: WsModelPart[]) => void;
  onInputTranscript: (data: WsInputTranscript) => void;
  onOutputTranscript: (data: WsOutputTranscript) => void;
  onTurnComplete: () => void;
  onToolCall: (data: WsToolCallData) => void;
  onOpen: () => void;
  onError: () => void;
  onClose: (code: number, reason: string, errMsg: string | null) => void;
  /** Called when setup times out — returns true if caller handled it (e.g. auto-reconnect) */
  onSetupTimeout: (msgCount: number) => boolean;
}

// ── Manager class ──

export class VoiceWebSocketManager {
  private ws: WebSocket | null = null;
  private keepaliveId: ReturnType<typeof setInterval> | null = null;
  private setupTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private callbacks: VoiceWsCallbacks;
  private sessionAttemptId: string;
  private setupMessage: Record<string, unknown>;
  private t0: number;
  private messageCount = 0;

  constructor(config: {
    callbacks: VoiceWsCallbacks;
    sessionAttemptId: string;
    setupMessage: Record<string, unknown>;
    t0: number;
  }) {
    this.callbacks = config.callbacks;
    this.sessionAttemptId = config.sessionAttemptId;
    this.setupMessage = config.setupMessage;
    this.t0 = config.t0;
  }

  /** Open a WebSocket to the given Vertex AI URL. */
  connect(url: string): WebSocket {
    const ws = new WebSocket(url);
    this.ws = ws;
    this.messageCount = 0;

    ws.onopen = () => this.handleOpen(ws);
    ws.onmessage = (event: MessageEvent) => this.handleMessage(ws, event);
    ws.onerror = () => this.handleError();
    ws.onclose = (event: CloseEvent) => this.handleClose(event);

    return ws;
  }

  /** Disconnect and clean up all timers. */
  disconnect(): void {
    this.clearSetupTimeout();
    this.clearKeepalive();

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  /** Send a JSON message. */
  send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** Send an audio chunk (base64 PCM). */
  sendAudio(base64Pcm: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          mediaChunks: [{ mimeType: LIVE_INPUT_MIME, data: base64Pcm }],
        },
      }),
    );
  }

  /** Get the raw WebSocket instance. */
  getWebSocket(): WebSocket | null {
    return this.ws;
  }

  // ── Event handlers ──

  private handleOpen(ws: WebSocket): void {
    console.warn('[VOICE:G2] ws_opened', {
      sessionAttemptId: this.sessionAttemptId,
      readyState: ws.readyState,
      msFromStart: Math.round(performance.now() - this.t0),
    });
    voiceLog('ws:opened', { readyState: ws.readyState });

    if (ws.readyState === WebSocket.OPEN) {
      console.warn('[VOICE:G2] sending_setup', { sessionAttemptId: this.sessionAttemptId });
      ws.send(JSON.stringify(this.setupMessage));
    }

    this.callbacks.onOpen();

    // Setup timeout
    this.setupTimeoutId = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const handled = this.callbacks.onSetupTimeout(this.messageCount);
        if (!handled) {
          this.disconnect();
        }
      }
    }, WEBSOCKET_SETUP_TIMEOUT_MS);
  }

  private handleMessage(_ws: WebSocket, event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data as string);
      this.messageCount += 1;

      if (this.messageCount <= 5) {
        console.warn(`[VOICE:G2] ws_message_${this.messageCount}`, {
          sessionAttemptId: this.sessionAttemptId,
          keys: Object.keys(data),
          hasSetupComplete:
            Object.prototype.hasOwnProperty.call(data, 'setupComplete') ||
            Object.prototype.hasOwnProperty.call(data, 'setup_complete'),
          hasError: !!data.error,
        });
      }

      // Server error
      if (data.error) {
        this.clearSetupTimeout();
        const code: number | undefined = data.error?.code;
        const serverMsg = String(data.error?.message || 'Voice session error');
        const userMessage =
          code === 429
            ? 'Voice rate limit reached — please wait a moment and try again.'
            : code === 503
              ? 'Voice service temporarily unavailable — please try again.'
              : mapSessionError(serverMsg);
        this.callbacks.onServerError({ code, message: serverMsg, userMessage });
        return;
      }

      // goAway
      const goAwayData = data.goAway || data.go_away;
      if (goAwayData) {
        const timeLeft = goAwayData.timeLeft || goAwayData.time_left;
        const resumptionToken =
          goAwayData.sessionResumptionToken || goAwayData.session_resumption_token;
        this.callbacks.onGoAway({ timeLeft, resumptionToken });
      }

      // Session resumption update
      const resumptionUpdate = data.sessionResumptionUpdate || data.session_resumption_update;
      if (resumptionUpdate) {
        const token = resumptionUpdate.newHandle || resumptionUpdate.new_handle;
        if (token) {
          this.callbacks.onResumptionUpdate({ token });
        }
      }

      // setupComplete
      const sc_content = data.serverContent || data.server_content;
      const setupComplete =
        Object.prototype.hasOwnProperty.call(data, 'setupComplete') ||
        Object.prototype.hasOwnProperty.call(data, 'setup_complete') ||
        (sc_content != null &&
          (Object.prototype.hasOwnProperty.call(sc_content, 'setupComplete') ||
            Object.prototype.hasOwnProperty.call(sc_content, 'setup_complete')));

      if (setupComplete) {
        this.clearSetupTimeout();
        this.startKeepalive();
        this.callbacks.onSetupComplete();
        if (!sc_content || setupComplete) return;
      }

      // Tool calls
      const toolCallData = data.toolCall || data.tool_call;
      if (toolCallData) {
        const fnCalls = toolCallData.functionCalls || toolCallData.function_calls || [];
        voiceLog('server:toolCall', {
          functions: (fnCalls as Array<{ name: string }>).map((fc: { name: string }) => fc.name),
        });
        this.callbacks.onToolCall({ functionCalls: fnCalls });
        return;
      }

      // Server content
      const rawSc = data.serverContent || data.server_content;
      if (rawSc) {
        this.dispatchServerContent(rawSc);
      }
    } catch {
      // Ignore malformed frames
    }
  }

  private dispatchServerContent(sc: Record<string, unknown>): void {
    if (sc.interrupted) {
      this.callbacks.onInterrupted();
      return;
    }

    // Model turn parts
    const modelTurn = (sc.modelTurn || sc.model_turn) as
      | { parts?: Array<Record<string, unknown>> }
      | undefined;
    const parts = modelTurn?.parts || [];
    if (parts.length > 0) {
      const parsed: WsModelPart[] = parts.map(part => {
        const inlineData = (part.inlineData || part.inline_data) as
          | { data?: string; mimeType?: string; mime_type?: string }
          | undefined;
        return {
          audioData: inlineData?.data,
          text: typeof part.text === 'string' ? part.text : undefined,
          mimeType: inlineData?.mimeType || inlineData?.mime_type,
        };
      });
      this.callbacks.onModelParts(parsed);
    }

    // Input transcript
    const inputTranscript = sc.inputTranscript || sc.input_transcript;
    if (inputTranscript) {
      const text =
        typeof inputTranscript === 'string'
          ? inputTranscript
          : (inputTranscript as { text?: string })?.text || '';
      if (text) {
        this.callbacks.onInputTranscript({ text });
      }
    }

    // Output transcript
    const outputTranscript = sc.outputTranscript || sc.output_transcript;
    if (outputTranscript) {
      const text =
        typeof outputTranscript === 'string'
          ? outputTranscript
          : (outputTranscript as { text?: string })?.text || '';
      if (text) {
        this.callbacks.onOutputTranscript({ text });
      }
    }

    // Turn complete
    const isTurnComplete = sc.turnComplete || sc.turn_complete;
    if (isTurnComplete) {
      this.callbacks.onTurnComplete();
    }
  }

  private handleError(): void {
    console.warn('[VOICE:G2] ws_error', { sessionAttemptId: this.sessionAttemptId });
    this.clearSetupTimeout();
    this.callbacks.onError();
  }

  private handleClose(event: CloseEvent): void {
    console.warn('[VOICE:G2] ws_closed', {
      sessionAttemptId: this.sessionAttemptId,
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });
    voiceLog('ws:closed', { code: event.code, reason: event.reason, wasClean: event.wasClean });
    this.clearSetupTimeout();
    this.clearKeepalive();

    const errMsg = mapWsCloseError(event.code, event.reason);
    this.callbacks.onClose(event.code, event.reason || '', errMsg);
  }

  // ── Timers ──

  private startKeepalive(): void {
    this.keepaliveId = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.clearKeepalive();
        return;
      }
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [{ mimeType: LIVE_INPUT_MIME, data: SILENT_KEEPALIVE_FRAME }],
          },
        }),
      );
      voiceLog('keepalive:sent', {});
    }, WS_KEEPALIVE_INTERVAL_MS);
  }

  private clearKeepalive(): void {
    if (this.keepaliveId !== null) {
      clearInterval(this.keepaliveId);
      this.keepaliveId = null;
    }
  }

  private clearSetupTimeout(): void {
    if (this.setupTimeoutId !== null) {
      clearTimeout(this.setupTimeoutId);
      this.setupTimeoutId = null;
    }
  }
}
