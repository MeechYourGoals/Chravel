/**
 * Single source of truth for concierge session state.
 *
 * Keyed by trip_id. Unifies:
 * - Message history (persistent in UI)
 * - Voice session state machine state
 * - last_error + last_success timestamps
 *
 * Query counts/limits remain in useConciergeUsage (server RPC).
 * Hydration: on trip open, load session from store; on tab switch, keep alive.
 */

import { create } from 'zustand';

export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface ConciergeSessionMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
    source?: string;
  }>;
  googleMapsWidget?: string;
  functionCallPlaces?: Array<{
    placeId?: string | null;
    name: string;
    address?: string;
    rating?: number | null;
    userRatingCount?: number | null;
    priceLevel?: string | null;
    mapsUrl?: string | null;
    previewPhotoUrl?: string | null;
    photoUrls?: string[];
  }>;
  functionCallFlights?: Array<{
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    deeplink: string;
  }>;
}

export interface ConciergeSession {
  tripId: string;
  messages: ConciergeSessionMessage[];
  voiceState: VoiceSessionState;
  lastError: string | null;
  lastErrorAt: number | null;
  lastSuccessAt: number | null;
  historyLoadedFromServer: boolean;
}

interface ConciergeSessionStore {
  sessions: Record<string, ConciergeSession>;
  getSession: (tripId: string) => ConciergeSession;
  setMessages: (tripId: string, messages: ConciergeSessionMessage[]) => void;
  updateMessages: (
    tripId: string,
    updater: (prev: ConciergeSessionMessage[]) => ConciergeSessionMessage[],
  ) => void;
  appendMessage: (tripId: string, message: ConciergeSessionMessage) => void;
  setVoiceState: (tripId: string, state: VoiceSessionState) => void;
  setLastError: (tripId: string, error: string | null) => void;
  setLastSuccess: (tripId: string) => void;
  setHistoryLoadedFromServer: (tripId: string, loaded: boolean) => void;
  hydrateMessages: (tripId: string, messages: ConciergeSessionMessage[]) => void;
  clearSession: (tripId: string) => void;
}

function createEmptySession(tripId: string): ConciergeSession {
  return {
    tripId,
    messages: [],
    voiceState: 'idle',
    lastError: null,
    lastErrorAt: null,
    lastSuccessAt: null,
    historyLoadedFromServer: false,
  };
}

export const useConciergeSessionStore = create<ConciergeSessionStore>((set, get) => ({
  sessions: {},

  getSession: (tripId: string) => {
    const sessions = get().sessions;
    if (sessions[tripId]) return sessions[tripId];
    return createEmptySession(tripId);
  },

  setMessages: (tripId: string, messages: ConciergeSessionMessage[]) => {
    set(state => {
      const session = state.sessions[tripId] ?? createEmptySession(tripId);
      return {
        sessions: {
          ...state.sessions,
          [tripId]: { ...session, messages },
        },
      };
    });
  },

  updateMessages: (
    tripId: string,
    updater: (prev: ConciergeSessionMessage[]) => ConciergeSessionMessage[],
  ) => {
    set(state => {
      const session = state.sessions[tripId] ?? createEmptySession(tripId);
      const messages = updater(session.messages);
      return {
        sessions: {
          ...state.sessions,
          [tripId]: { ...session, messages },
        },
      };
    });
  },

  appendMessage: (tripId: string, message: ConciergeSessionMessage) => {
    set(state => {
      const session = state.sessions[tripId] ?? createEmptySession(tripId);
      const messages = [...session.messages, message];
      return {
        sessions: {
          ...state.sessions,
          [tripId]: { ...session, messages },
        },
      };
    });
  },

  setVoiceState: (tripId: string, voiceState: VoiceSessionState) => {
    set(state => {
      const session = state.sessions[tripId] ?? createEmptySession(tripId);
      return {
        sessions: {
          ...state.sessions,
          [tripId]: { ...session, voiceState },
        },
      };
    });
  },

  setLastError: (tripId: string, error: string | null) => {
    set(state => {
      const session = state.sessions[tripId] ?? createEmptySession(tripId);
      return {
        sessions: {
          ...state.sessions,
          [tripId]: {
            ...session,
            lastError: error,
            lastErrorAt: error ? Date.now() : null,
          },
        },
      };
    });
  },

  setLastSuccess: (tripId: string) => {
    set(state => {
      const session = state.sessions[tripId] ?? createEmptySession(tripId);
      return {
        sessions: {
          ...state.sessions,
          [tripId]: { ...session, lastSuccessAt: Date.now() },
        },
      };
    });
  },

  setHistoryLoadedFromServer: (tripId: string, loaded: boolean) => {
    set(state => {
      const session = state.sessions[tripId] ?? createEmptySession(tripId);
      return {
        sessions: {
          ...state.sessions,
          [tripId]: { ...session, historyLoadedFromServer: loaded },
        },
      };
    });
  },

  /** Hydrate messages from server history. Only overwrites if current messages empty. */
  hydrateMessages: (tripId: string, messages: ConciergeSessionMessage[]) => {
    set(state => {
      const session = state.sessions[tripId] ?? createEmptySession(tripId);
      const nextMessages = session.messages.length === 0 ? messages : session.messages;
      return {
        sessions: {
          ...state.sessions,
          [tripId]: {
            ...session,
            messages: nextMessages,
            historyLoadedFromServer: messages.length > 0,
          },
        },
      };
    });
  },

  clearSession: (tripId: string) => {
    set(state => {
      const next = { ...state.sessions };
      delete next[tripId];
      return { sessions: next };
    });
  },
}));
