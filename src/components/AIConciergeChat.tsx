import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Crown, Sparkles, ImagePlus } from 'lucide-react';
import { ConciergeSearchModal } from './ai/ConciergeSearchModal';
import { TripPreferences } from '../types/consumer';
import { useBasecamp } from '../contexts/BasecampContext';
import { ChatMessages } from '@/features/chat/components/ChatMessages';
import { AiChatInput } from '@/features/chat/components/AiChatInput';
import { useConciergeUsage } from '../hooks/useConciergeUsage';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useAuth } from '@/hooks/useAuth';
import { useConciergeHistory } from '../hooks/useConciergeHistory';
import { conciergeCacheService } from '../services/conciergeCacheService';
import { useAIConciergePreferences } from '../hooks/useAIConciergePreferences';
import {
  invokeConcierge,
  invokeConciergeStream,
  type StreamMetadataEvent,
  type ReservationDraft,
  type TripCard,
  type StreamSmartImportPreviewEvent,
  type SmartImportPreviewEvent,
  type SmartImportStatus,
} from '@/services/conciergeGateway';
import type { HotelResult } from '@/features/chat/components/HotelResultCards';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useWebSpeechVoice } from '@/hooks/useWebSpeechVoice';
import type { VoiceState } from '@/hooks/useWebSpeechVoice';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import type { GeminiLiveState } from '@/hooks/useGeminiLive';
import { useVoiceToolHandler } from '@/hooks/useVoiceToolHandler';
import { VoiceLiveOverlay } from '@/features/chat/components/VoiceLiveOverlay';
import { CTA_BUTTON, CTA_ICON_SIZE } from '@/lib/ctaButtonStyles';
import { supabase } from '@/integrations/supabase/client';
import { useConciergeSessionStore, type ConciergeSession } from '@/store/conciergeSessionStore';
import { useSaveToTripPlaces } from '@/hooks/useSaveToTripPlaces';

const EMPTY_SESSION: ConciergeSession = {
  tripId: '',
  messages: [],
  voiceState: 'idle',
  lastError: null,
  lastErrorAt: null,
  lastSuccessAt: null,
  historyLoadedFromServer: false,
};

// ─── Feature Flags ────────────────────────────────────────────────────────────
const UPLOAD_ENABLED = true;
// Voice: Conversation (waveform → Gemini Live) + Dictation (mic-in-input → Web Speech API)
// ─────────────────────────────────────────────────────────────────────────────

/** Map GeminiLiveState → VoiceState for VoiceButton visuals */
const mapLiveStateToVoiceState = (s: GeminiLiveState): VoiceState => {
  switch (s) {
    case 'requesting_mic':
      return 'connecting';
    case 'ready':
    case 'listening':
    case 'interrupted':
      return 'listening';
    case 'sending':
      return 'thinking';
    case 'playing':
      return 'speaking';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
};

interface AIConciergeChatProps {
  tripId: string;
  basecamp?: { name: string; address: string };
  preferences?: TripPreferences;
  isDemoMode?: boolean;
  onTabChange?: (tab: string) => void;
}

export interface ChatMessage {
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
  /** Rich place results from searchPlaces / getPlaceDetails tool calls */
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
  /** Rich flight results from searchFlights tool calls */
  functionCallFlights?: Array<{
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    deeplink: string;
    provider?: string | null;
    price?: { amount?: number | null; currency?: string | null; display?: string | null } | null;
    airline?: string | null;
    flightNumber?: string | null;
    stops?: number | null;
    durationMinutes?: number | null;
    departTime?: string | null;
    arriveTime?: string | null;
    refundable?: boolean | null;
  }>;
  /** Rich hotel results from searchHotels tool calls or trip_cards event */
  functionCallHotels?: HotelResult[];
  /** Action results from concierge write tools (createPoll, createTask, etc.) */
  conciergeActions?: Array<{
    actionType: string;
    success: boolean;
    message: string;
    entityId?: string;
    entityName?: string;
    scope?: string;
  }>;
  /** Reservation draft cards from emitReservationDraft tool */
  reservationDrafts?: ReservationDraft[];
  /** Smart Import preview data from emitSmartImportPreview tool */
  smartImportPreview?: {
    previewEvents: SmartImportPreviewEvent[];
    tripId: string;
    totalEvents: number;
    duplicateCount: number;
    lodgingName?: string;
  };
  /** Smart Import status messages (parsing progress) */
  smartImportStatus?: { status: SmartImportStatus; message: string };
  /**
   * True while this message is the live-streaming voice response from Gemini
   * Live (Fix 2).  Rendered with a pulsing ring so the user sees the assistant
   * is still speaking.  Cleared by handleLiveTurnComplete when the turn ends.
   */
  isStreamingVoice?: boolean;
}

interface ConciergeInvokePayload {
  response?: string;
  usage?: ChatMessage['usage'];
  sources?: ChatMessage['sources'];
  citations?: ChatMessage['sources'];
  googleMapsWidget?: string;
  success?: boolean;
  error?: string;
}

interface ConciergeAttachment {
  mimeType: string;
  data: string;
  name?: string;
}

interface FallbackEvent {
  title?: string;
  name?: string;
  startTime?: string;
  location?: string;
}

interface FallbackPayment {
  isSettled?: boolean;
  settled?: boolean;
  amount?: number;
  description?: string;
  paidBy?: string;
  createdByName?: string;
}

interface FallbackTripContext {
  itinerary?: FallbackEvent[];
  calendar?: FallbackEvent[];
  payments?: FallbackPayment[];
}

const FAST_RESPONSE_TIMEOUT_MS = 60_000;
const _MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB — keeps base64 under 6 MB server limit
const _ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

/** Simple unique ID generator for chat messages */
const _uniqueId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const fileToAttachmentPayload = async (file: File): Promise<ConciergeAttachment> => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}"`));
    reader.readAsDataURL(file);
  });

  const base64Index = dataUrl.indexOf('base64,');
  if (base64Index < 0) {
    throw new Error(`Unable to encode "${file.name}" for upload`);
  }

  return {
    mimeType: file.type || 'image/jpeg',
    data: dataUrl.substring(base64Index + 'base64,'.length),
    name: file.name,
  };
};

const invokeConciergeWithTimeout = async (
  requestBody: Record<string, unknown> & { message: string },
  options: { demoMode?: boolean } = {},
): Promise<{ data: ConciergeInvokePayload | null; error: { message?: string } | null }> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('AI request timed out'));
    }, FAST_RESPONSE_TIMEOUT_MS);
  });

  try {
    const response = (await Promise.race([
      invokeConcierge(requestBody, options),
      timeoutPromise,
    ])) as {
      data: ConciergeInvokePayload | null;
      error: { message?: string } | null;
    };

    return response;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const AIConciergeChat = ({
  tripId,
  basecamp,
  preferences,
  isDemoMode = false,
  onTabChange,
}: AIConciergeChatProps) => {
  const { basecamp: globalBasecamp } = useBasecamp();
  const { usage, refreshUsage, isLimitedPlan, userPlan, upgradeUrl } = useConciergeUsage(tripId);
  const { isOffline } = useOfflineStatus();
  const { user } = useAuth();
  const loadedPreferences = useAIConciergePreferences();
  const effectivePreferences = preferences ?? loadedPreferences;
  const storeSessionRaw = useConciergeSessionStore(s => s.sessions[tripId]);
  const storeSession = storeSessionRaw ?? EMPTY_SESSION;
  const setStoreMessages = useConciergeSessionStore(s => s.setMessages);

  const handleNavigateToPlaces = useCallback(() => {
    if (onTabChange) onTabChange('places');
  }, [onTabChange]);

  const { savePlace, saveFlight, saveHotel, isUrlSaved, isSaving } = useSaveToTripPlaces({
    tripId,
    userId: user?.id ?? 'anonymous',
    isDemoMode,
    onNavigateToPlaces: handleNavigateToPlaces,
  });

  // Hydrate from Zustand store on mount (preserves messages across tab switches)
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    storeSession.messages.length > 0 ? (storeSession.messages as ChatMessage[]) : [],
  );
  const messagesRef = useRef<ChatMessage[]>(messages);
  // True after the chat is hydrated from the server DB (not just cache/empty).
  // Used to show the "Picked up where you left off" chip.
  const [historyLoadedFromServer, setHistoryLoadedFromServer] = useState(
    storeSession.historyLoadedFromServer,
  );

  // --- Persisted history hydration ---
  const {
    data: historyMessages,
    isLoading: isHistoryLoading,
    error: historyError,
  } = useConciergeHistory(tripId);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<
    'checking' | 'connected' | 'limited' | 'error' | 'thinking' | 'offline' | 'degraded' | 'timeout'
  >('connected');
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const handleSendMessageRef = useRef<(messageOverride?: string) => Promise<void>>(async () =>
    Promise.resolve(),
  );
  const hasShownLimitToastRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMounted = useRef(true);
  // Guard so history hydration only fires once per mount, even if historyMessages
  // reference changes. Avoids the stale-closure race where messages.length is
  // read from a stale closure but the user has already submitted a message.
  const hasHydratedRef = useRef(false);

  // ─── Voice ─────────────────────────────────────────────────────────────────
  // Two separate voice affordances:
  //   1. Conversation mode (waveform button) → Gemini Live bidirectional
  //   2. Dictation mode (mic inside input) → Web Speech API, text-to-input
  // Mutual exclusion: starting one stops the other automatically.
  const [liveOverlayOpen, setLiveOverlayOpen] = useState(false);

  /**
   * Fix 2 — streaming voice response bubble.
   *
   * While Gemini Live is in 'playing' state (assistant speaking), we maintain
   * a transient ChatMessage here so the chat scroll area shows a live-updating
   * bubble — matching ChatGPT / Grok behaviour where the assistant's turn is
   * visible in the chat *while* it is being spoken, not only in the compact
   * VoiceLiveOverlay banner.
   *
   * Lifecycle:
   *   liveAssistantTranscript updates + liveState === 'playing'  → set here
   *   handleLiveTurnComplete fires (turn finalised)              → set to null
   *   liveState goes to idle/error/ready without a complete turn → set to null
   */
  const [streamingVoiceMessage, setStreamingVoiceMessage] = useState<ChatMessage | null>(null);

  /**
   * Live user speech-to-text bubble.
   *
   * While Gemini Live is listening or sending (user is speaking), we show a
   * transient user-side bubble with the interim STT transcript so the user can
   * see their own words appearing in chat — the "I'm hearing you" indicator.
   *
   * Lifecycle:
   *   liveUserTranscript updates + liveState === 'listening'|'sending'|'interrupted'  → set here
   *   handleLiveTurnComplete fires (user utterance finalised)                           → set to null
   *   liveState goes to idle/error/ready/playing without turn completion                → set to null
   */
  const [streamingUserMessage, setStreamingUserMessage] = useState<ChatMessage | null>(null);

  // Dictation (Web Speech API) — always initialized so hooks order is stable
  const handleDictationResult = useCallback((text: string) => {
    if (!text.trim()) return;
    setInputMessage(prev => (prev ? prev + ' ' + text.trim() : text.trim()));
  }, []);

  const {
    voiceState: dictationState,
    toggleVoice: toggleDictation,
    stopVoice: stopDictation,
    errorMessage: dictationError,
  } = useWebSpeechVoice(handleDictationResult);

  // Gemini Live bidirectional voice — always initialized (hooks rules)
  const { handleToolCall } = useVoiceToolHandler({
    tripId,
    userId: user?.id ?? '',
  });

  const handleLiveTurnComplete = useCallback(
    (userText: string, assistantText: string) => {
      const now = new Date().toISOString();
      const newMessages: ChatMessage[] = [];
      if (userText) {
        newMessages.push({
          id: `voice-user-${Date.now()}`,
          type: 'user',
          content: userText,
          timestamp: now,
        });
      }
      if (assistantText) {
        newMessages.push({
          id: `voice-assistant-${Date.now()}`,
          type: 'assistant',
          content: assistantText,
          timestamp: now,
        });
      }
      if (newMessages.length > 0) {
        // Immediate in-memory update — keeps the UI responsive.
        setMessages(prev => [...prev, ...newMessages]);
      }

      // Clear both streaming bubbles now that the finalised messages have been
      // appended to `messages` above. This prevents any flash of the transient
      // bubbles before the permanent messages appear.
      setStreamingVoiceMessage(null);
      setStreamingUserMessage(null);

      // Fix 1: Persist the completed voice turn to Supabase (ai_queries table).
      // We store both sides as a single row: query_text = user utterance,
      // response_text = assistant reply.  Only persists when both sides are
      // present and the user is authenticated.
      //
      // NOTE: The ai_queries schema does not have a dedicated `source` column
      // to flag voice vs. text turns.  A future migration adding
      // `source VARCHAR DEFAULT 'text'` would let the history hook differentiate
      // voice interactions without changing this call site.
      if (userText && assistantText && user?.id) {
        supabase
          .from('ai_queries')
          .insert({
            trip_id: tripId,
            user_id: user.id,
            query_text: userText,
            response_text: assistantText,
            created_at: now,
          })
          .then(({ error }) => {
            if (error) {
              console.error('[Voice] Failed to persist voice turn:', error.message);
              toast.warning('Voice turn not saved', {
                description: 'Your voice conversation could not be saved to history.',
              });
            }
          });
      }
    },
    // user?.id and tripId are the only external values used inside.

    [user?.id, tripId],
  );

  const handleLiveError = useCallback((msg: string) => {
    toast.error('Voice error', { description: msg });
  }, []);

  const {
    state: liveState,
    error: liveError,
    userTranscript: liveUserTranscript,
    assistantTranscript: liveAssistantTranscript,
    startSession: startLiveSession,
    endSession: endLiveSession,
    circuitBreakerOpen: liveCircuitBreakerOpen,
    resetCircuitBreaker: resetLiveCircuitBreaker,
  } = useGeminiLive({
    tripId,
    onToolCall: handleToolCall,
    onTurnComplete: handleLiveTurnComplete,
    onError: handleLiveError,
  });

  // Conversation-mode VoiceState (mapped from Gemini Live states)
  const convoVoiceState: VoiceState = mapLiveStateToVoiceState(liveState);

  // Show dictation errors as toasts
  useEffect(() => {
    if (dictationError) {
      toast.error('Voice error', { description: dictationError });
    }
  }, [dictationError]);

  // Close overlay when live session ends
  useEffect(() => {
    if (liveState === 'idle' && liveOverlayOpen) {
      const timer = setTimeout(() => setLiveOverlayOpen(false), 300);
      return () => clearTimeout(timer);
    }
  }, [liveState, liveOverlayOpen]);

  // Conversation toggle — stops dictation first if active
  const handleConvoToggle = useCallback(() => {
    const dictationActive = dictationState === 'listening' || dictationState === 'connecting';

    if (liveState !== 'idle' && liveState !== 'error') {
      // Already in conversation — end it (fire-and-forget; no need to sequence anything after)
      void endLiveSession();
      return;
    }

    if (dictationActive) {
      // Stop dictation (.abort() fires immediately, releasing the mic) then wait for iOS
      // to yield the AVAudioSession slot before getUserMedia is called.
      // 350ms covers A12-era iPhones (iPhone XS/XR) where the OS can take up to
      // ~300ms to fully release the hardware mic after SpeechRecognition.abort().
      stopDictation();
      setLiveOverlayOpen(true);
      setTimeout(() => {
        void startLiveSession();
      }, 350);
    } else {
      setLiveOverlayOpen(true);
      void startLiveSession();
    }
  }, [dictationState, stopDictation, liveState, startLiveSession, endLiveSession]);

  // Dictation toggle — stops conversation first if active.
  //
  // We await endLiveSession() so the AudioContext and MediaStream tracks from Gemini Live
  // are fully released before Web Speech API tries to acquire the same mic device.
  //
  // IMPORTANT iOS timing note: AudioContext.close() resolves its Promise before iOS has
  // fully released the AVAudioSession hardware slot. On A12 and older chips (iPhone XS/XR
  // era) the OS can take an additional 150-500ms after the Promise resolves. We add a
  // 200ms post-close buffer before calling toggleDictation() so SpeechRecognition.start()
  // does not fire into a still-locked mic, which would produce NotAllowedError or a silent
  // "network" error on iOS Safari.
  const handleDictationToggle = useCallback(async () => {
    const isConvoActive = liveState !== 'idle' && liveState !== 'error';
    if (isConvoActive) {
      await endLiveSession();
      setLiveOverlayOpen(false);
      // Post-close buffer: AudioContext.close() Promise resolving ≠ iOS AVAudioSession
      // slot freed. Give the OS time to fully release the hardware mic before Web Speech
      // API calls SpeechRecognition.start(). 200ms covers most devices; A12 chips may
      // still be borderline — see the retry logic in useWebSpeechVoice for the safety net.
      await new Promise<void>(resolve => setTimeout(resolve, 200));
    }
    toggleDictation();
  }, [liveState, endLiveSession, toggleDictation]);

  const handleEndLiveSession = useCallback(() => {
    void endLiveSession();
    setLiveOverlayOpen(false);
  }, [endLiveSession]);

  // Fix 2: Keep the streaming voice bubble in sync with liveAssistantTranscript.
  // While Gemini Live is in 'playing' state, update the transient bubble so the
  // chat shows the assistant's response growing in real-time (like ChatGPT/Grok).
  // When the turn completes, handleLiveTurnComplete clears it and appends the
  // finalised message to `messages`, so there is no duplication.
  useEffect(() => {
    if (liveState === 'playing' && liveAssistantTranscript) {
      setStreamingVoiceMessage({
        id: 'voice-streaming-live',
        type: 'assistant',
        content: liveAssistantTranscript,
        timestamp: new Date().toISOString(),
        isStreamingVoice: true,
      });
    } else if (liveState === 'idle' || liveState === 'error' || liveState === 'ready') {
      // Session ended or reset without a completed turn — clear any leftover bubble.
      setStreamingVoiceMessage(null);
    }
  }, [liveState, liveAssistantTranscript]);

  // Keep the live user STT bubble in sync with liveUserTranscript.
  // While Gemini Live is listening/sending, show the interim user transcript as a
  // user-side bubble so the speaker can see their words appearing in the chat
  // (the "I'm hearing you" indicator).  Cleared when the turn finalises.
  useEffect(() => {
    const isUserSpeaking =
      liveState === 'listening' || liveState === 'sending' || liveState === 'interrupted';

    if (isUserSpeaking && liveUserTranscript) {
      setStreamingUserMessage({
        id: 'voice-user-streaming-live',
        type: 'user',
        content: liveUserTranscript,
        timestamp: new Date().toISOString(),
        isStreamingVoice: true,
      });
    } else if (liveState === 'idle' || liveState === 'error' || liveState === 'ready') {
      // Session ended — clear any leftover user bubble.
      setStreamingUserMessage(null);
    } else if (liveState === 'playing') {
      // Assistant started speaking — user turn is complete, clear user bubble.
      setStreamingUserMessage(null);
    }
  }, [liveState, liveUserTranscript]);

  // ── End voice ────────────────────────────────────────────────────────────

  // Abort in-flight stream when component unmounts (prevents setState on unmounted + wasted bandwidth)
  const streamAbortRef = useRef<(() => void) | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Track mount state + abort in-flight streams on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      streamAbortRef.current?.();
      streamAbortRef.current = null;
    };
  }, []);

  // Hydrate messages from persisted RPC history on mount.
  // Fires once per mount via hasHydratedRef — eliminates the stale-closure race
  // where messages.length might read a stale value if the user submits at the same
  // instant history loads. The functional setState updater is the source of truth.
  useEffect(() => {
    if (isHistoryLoading || hasHydratedRef.current) return;

    if (historyError) {
      console.error('[AIConciergeChat] Failed to load persisted history:', historyError);
      // Fallback: try localStorage cache (covers offline + RPC failure scenarios)
      const userId = user?.id ?? 'anonymous';
      const cached = conciergeCacheService.getCachedMessages(tripId, userId);
      if (cached.length > 0) {
        setMessages(prev => (prev.length === 0 ? cached : prev));
      }
      hasHydratedRef.current = true;
      return;
    }

    if (historyMessages.length > 0) {
      // Use functional updater so we read the live messages state, not a closure copy.
      setMessages(prev => {
        if (prev.length > 0) return prev; // user already sent a message — don't overwrite
        return historyMessages;
      });
      setHistoryLoadedFromServer(true);
    }

    hasHydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHistoryLoading, historyError, historyMessages]);

  // Fallback when offline: show cached messages from localStorage.
  useEffect(() => {
    if (!isOffline || messages.length > 0) return;
    const userId = user?.id ?? 'anonymous';
    const cached = conciergeCacheService.getCachedMessages(tripId, userId);
    if (cached.length > 0) {
      setMessages(cached);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline]);

  // Sync messages to Zustand store so they persist across tab switches
  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 0) {
      setStoreMessages(
        tripId,
        messages as import('@/store/conciergeSessionStore').ConciergeSessionMessage[],
      );
    }
  }, [messages, tripId, setStoreMessages]);

  // Auto-scroll to bottom when new messages, typing indicator, or streaming voice
  // bubbles appear/update — keeps the live transcript visible as it grows.
  useEffect(() => {
    if (
      chatScrollRef.current &&
      (messages.length > 0 || isTyping || streamingVoiceMessage || streamingUserMessage)
    ) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages.length, isTyping, messages, streamingVoiceMessage, streamingUserMessage]);

  // Failsafe: if a stream callback never finalizes, release typing state so
  // users can still send a follow-up without needing a hard refresh.
  useEffect(() => {
    if (!isTyping) return;

    const watchdog = setTimeout(() => {
      if (!isMounted.current) return;
      setIsTyping(false);
      setAiStatus(prev => (prev === 'thinking' ? 'timeout' : prev));
      if (import.meta.env.DEV) {
        console.warn('[AIConciergeChat] Typing watchdog released a stuck request state.');
      }
    }, FAST_RESPONSE_TIMEOUT_MS + 5_000);

    return () => clearTimeout(watchdog);
  }, [isTyping]);

  // ⚡ PERFORMANCE: 8-second initialization timeout to prevent indefinite loading
  useEffect(() => {
    if (aiStatus === 'connected' || messages.length > 0) {
      return;
    }

    const timeout = setTimeout(() => {
      if (isMounted.current && aiStatus === 'checking') {
        console.warn('[AIConciergeChat] Initialization timeout - showing fallback');
        setAiStatus('timeout');
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [aiStatus, messages.length]);

  const isQueryLimitReached = Boolean(isLimitedPlan && usage?.isLimitReached);

  const showLimitReachedToast = useCallback((plan: 'free' | 'explorer') => {
    const message =
      plan === 'free'
        ? "You've used all 5 Concierge asks for this trip."
        : "You've used all 10 Concierge asks for this trip.";
    toast.error(message, {
      description: 'Upgrade to Frequent Chraveler for unlimited Concierge.',
    });
  }, []);

  useEffect(() => {
    if (!isQueryLimitReached || !usage?.limit) {
      hasShownLimitToastRef.current = false;
      return;
    }

    if (hasShownLimitToastRef.current) return;
    showLimitReachedToast(usage.plan === 'explorer' ? 'explorer' : 'free');
    hasShownLimitToastRef.current = true;
  }, [isQueryLimitReached, showLimitReachedToast, usage?.limit, usage?.plan]);

  // Monitor offline status
  useEffect(() => {
    if (isOffline) {
      setAiStatus('offline');
    } else if (aiStatus === 'offline') {
      setAiStatus('connected');
    }
  }, [isOffline, aiStatus]);

  // ── Smart Import: confirm/dismiss handlers ──────────────────────────────
  const [smartImportStates, setSmartImportStates] = useState<
    Record<string, { isImporting: boolean; result: { imported: number; failed: number } | null }>
  >({});

  const handleSmartImportConfirm = useCallback(
    async (messageId: string, events: SmartImportPreviewEvent[]) => {
      if (!tripId || events.length === 0) return;

      setSmartImportStates(prev => ({
        ...prev,
        [messageId]: { isImporting: true, result: null },
      }));

      try {
        const { calendarService } = await import('@/services/calendarService');
        const createEvents = events.map(evt => ({
          trip_id: tripId,
          title: evt.title,
          start_time: evt.startTime,
          end_time: evt.endTime || undefined,
          location: evt.location || undefined,
          event_category: evt.category || 'other',
          include_in_itinerary: true,
          source_type: 'ai_concierge_import',
          source_data: {
            imported_from: 'concierge_smart_import',
            notes: evt.notes || undefined,
            import_hash: `${tripId}|${evt.title.toLowerCase().trim()}|${evt.startTime}`,
          },
        }));

        const result = await calendarService.bulkCreateEvents(createEvents);

        setSmartImportStates(prev => ({
          ...prev,
          [messageId]: {
            isImporting: false,
            result: { imported: result.imported, failed: result.failed },
          },
        }));

        if (result.imported > 0) {
          toast.success(
            `Added ${result.imported} event${result.imported !== 1 ? 's' : ''} to Calendar`,
          );
        }
        if (result.failed > 0) {
          toast.error(`${result.failed} event${result.failed !== 1 ? 's' : ''} failed to import`);
        }
      } catch (_err) {
        setSmartImportStates(prev => ({
          ...prev,
          [messageId]: { isImporting: false, result: { imported: 0, failed: events.length } },
        }));
        toast.error('Failed to import events. Please try again.');
      }
    },
    [tripId],
  );

  const handleSmartImportDismiss = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, smartImportPreview: undefined } : m)),
    );
  }, []);

  // ── Delete a single concierge message (privacy) ──────────────────────────
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      // Remove from local state immediately
      setMessages(prev => prev.filter(m => m.id !== messageId));

      // If it's a persisted history message, also update DB
      const historyMatch = messageId.match(/^history-(user|assistant)-([^-]+)/);
      if (historyMatch && user?.id) {
        const [, role, rowId] = historyMatch;
        if (role === 'user') {
          // Delete entire row (removes both Q and A from DB)
          await supabase.from('ai_queries').delete().eq('id', rowId).eq('user_id', user.id);
          // Also remove the paired assistant message from UI
          const pairedPrefix = `history-assistant-${rowId}`;
          setMessages(prev => prev.filter(m => !m.id.startsWith(pairedPrefix)));
        } else {
          // Just null out the response text in DB
          await supabase
            .from('ai_queries')
            .update({ response_text: null })
            .eq('id', rowId)
            .eq('user_id', user.id);
        }
      }
    },
    [user?.id],
  );

  const handleSendMessage = async (messageOverride?: string) => {
    const typedMessage =
      typeof messageOverride === 'string' ? messageOverride.trim() : inputMessage.trim();
    const selectedImages = UPLOAD_ENABLED ? [...attachedImages] : [];
    const hasImageAttachments = selectedImages.length > 0;
    if ((!typedMessage && !hasImageAttachments) || isTyping) return;

    const messageToSend =
      typedMessage || `Please analyze the ${selectedImages.length} attached image(s).`;
    const userDisplayContent =
      typedMessage ||
      `📎 Attached ${selectedImages.length} image${selectedImages.length === 1 ? '' : 's'}`;

    if (isOffline) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'user',
          content: messageToSend,
          timestamp: new Date().toISOString(),
        },
        {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content:
            "📡 **Offline Mode**\n\nI can't send this request while you're offline. Reconnect and try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
      if (!messageOverride) {
        setInputMessage('');
      }
      return;
    }

    const userMessage: ChatMessage = {
      id: _uniqueId('user'),
      type: 'user',
      content: userDisplayContent,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = messageToSend;
    if (!messageOverride) {
      setInputMessage('');
    }
    if (selectedImages.length > 0) {
      setAttachedImages([]);
    }
    setIsTyping(true);
    setAiStatus('thinking');

    if (isLimitedPlan) {
      const latestUsage = await refreshUsage();

      if (!latestUsage) {
        toast.error('Unable to verify Concierge query allowance right now. Please try again.');
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        setIsTyping(false);
        return;
      }

      if (latestUsage.isLimitReached && latestUsage.limit !== null) {
        showLimitReachedToast(latestUsage.plan === 'explorer' ? 'explorer' : 'free');
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        setIsTyping(false);
        return;
      }
    }

    const fallbackContext = {
      tripId,
      title: 'Current Trip',
      location: globalBasecamp?.address || basecamp?.address || 'Unknown location',
      dateRange: new Date().toISOString().split('T')[0],
      itinerary: [],
      calendar: [],
      payments: [],
    };

    const basecampLocation = globalBasecamp
      ? {
          name: globalBasecamp.name || 'Basecamp',
          address: globalBasecamp.address,
        }
      : basecamp
        ? {
            name: basecamp.name || 'Basecamp',
            address: basecamp.address,
          }
        : undefined;

    let streamingStarted = false;

    try {
      let attachments: ConciergeAttachment[] = [];
      if (selectedImages.length > 0) {
        attachments = await Promise.all(selectedImages.map(fileToAttachmentPayload));
      }

      const MAX_MESSAGE_LENGTH = 3000;
      const chatHistory = messages.slice(-6).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content:
          msg.content.length > MAX_MESSAGE_LENGTH
            ? msg.content.substring(0, MAX_MESSAGE_LENGTH) + '...[truncated]'
            : msg.content,
      }));

      const requestBody = {
        message: currentInput,
        tripId,
        preferences: effectivePreferences,
        chatHistory,
        attachments,
        isDemoMode,
        config: {
          model: 'gemini-3-flash-preview',
          temperature: 0.55,
          maxTokens: 4096,
        },
      };

      // ========== STREAMING PATH ==========
      if (!isDemoMode) {
        const streamingMessageId = _uniqueId('stream');
        let receivedAnyChunk = false;
        let accumulatedStreamContent = ''; // accumulates full text so we can cache after onDone
        const streamTimer = { id: undefined as ReturnType<typeof setTimeout> | undefined };

        const updateStreamMsg = (updater: (msg: ChatMessage) => Partial<ChatMessage>) => {
          setMessages(prev => {
            const idx = prev.findIndex(m => m.id === streamingMessageId);
            if (idx === -1) return prev;
            const patch = updater(prev[idx]);
            if (Object.keys(patch).length === 0) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...patch };
            return updated;
          });
        };

        const streamHandle = invokeConciergeStream(
          requestBody,
          {
            onChunk: (text: string) => {
              if (!isMounted.current) return;
              accumulatedStreamContent += text; // always accumulate for caching
              if (!receivedAnyChunk) {
                receivedAnyChunk = true;
                setIsTyping(false);
                setMessages(prev => {
                  const idx = prev.findIndex(m => m.id === streamingMessageId);
                  if (idx !== -1) {
                    // Message already created by onFunctionCall (place cards) — append text to it
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], content: text };
                    return updated;
                  }
                  return [
                    ...prev,
                    {
                      id: streamingMessageId,
                      type: 'assistant' as const,
                      content: text,
                      timestamp: new Date().toISOString(),
                    },
                  ];
                });
                return;
              }
              updateStreamMsg(msg => ({ content: msg.content + text }));
            },
            onFunctionCall: (name: string, result: Record<string, unknown>) => {
              if (!isMounted.current) return;
              // Tool execution means the stream is alive — prevent timeout.
              receivedAnyChunk = true;
              // Ensure the streaming message exists so place cards render immediately,
              // even before the first text chunk arrives (tools run before LLM response).
              const ensureAndPatch = (patch: Partial<ChatMessage>) => {
                setMessages(prev => {
                  const idx = prev.findIndex(m => m.id === streamingMessageId);
                  if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], ...patch };
                    return updated;
                  }
                  // Create placeholder message so place cards appear immediately
                  return [
                    ...prev,
                    {
                      id: streamingMessageId,
                      type: 'assistant' as const,
                      content: '',
                      timestamp: new Date().toISOString(),
                      ...patch,
                    },
                  ];
                });
              };

              if (name === 'searchPlaces' && result.places && Array.isArray(result.places)) {
                ensureAndPatch({
                  functionCallPlaces: result.places as ChatMessage['functionCallPlaces'],
                });
              }
              if (name === 'searchFlights' && result.success) {
                const flightResult = {
                  origin: result.origin as string,
                  destination: result.destination as string,
                  departureDate: result.departureDate as string,
                  returnDate: result.returnDate as string | undefined,
                  passengers: (result.passengers as number) || 1,
                  deeplink: result.deeplink as string,
                  provider: result.provider as string | null,
                  price:
                    (result.price as {
                      amount?: number | null;
                      currency?: string | null;
                      display?: string | null;
                    } | null) ?? null,
                  airline: result.airline as string | null,
                  flightNumber: result.flightNumber as string | null,
                  stops: result.stops as number | null,
                  durationMinutes: result.durationMinutes as number | null,
                  departTime: result.departTime as string | null,
                  arriveTime: result.arriveTime as string | null,
                  refundable: result.refundable as boolean | null,
                };
                ensureAndPatch({
                  functionCallFlights: [flightResult],
                });
              }
              // searchHotels function call → hotel cards
              if (name === 'searchHotels' && result.hotels && Array.isArray(result.hotels)) {
                ensureAndPatch({
                  functionCallHotels: result.hotels as HotelResult[],
                });
              }
              // Single hotel detail from getHotelDetails
              if (name === 'getHotelDetails' && result.success && result.title) {
                const hotelResult: HotelResult = {
                  id: result.id as string | null,
                  provider: result.provider as string | null,
                  title: result.title as string,
                  subtitle: result.subtitle as string | null,
                  badges: result.badges as string[] | undefined,
                  price: result.price as HotelResult['price'],
                  dates: result.dates as HotelResult['dates'],
                  location: result.location as HotelResult['location'],
                  details: result.details as HotelResult['details'],
                  deep_links: result.deep_links as HotelResult['deep_links'],
                };
                setMessages(prev => {
                  const idx = prev.findIndex(m => m.id === streamingMessageId);
                  if (idx !== -1) {
                    const existing = prev[idx].functionCallHotels || [];
                    const updated = [...prev];
                    updated[idx] = {
                      ...updated[idx],
                      functionCallHotels: [...existing, hotelResult],
                    };
                    return updated;
                  }
                  return [
                    ...prev,
                    {
                      id: streamingMessageId,
                      type: 'assistant' as const,
                      content: '',
                      timestamp: new Date().toISOString(),
                      functionCallHotels: [hotelResult],
                    },
                  ];
                });
              }
              if (name === 'getPlaceDetails' && result.success) {
                const detailPlace = {
                  placeId: result.placeId as string,
                  name: result.name as string,
                  address: result.address as string,
                  rating: result.rating as number | null,
                  userRatingCount: result.userRatingCount as number | null,
                  priceLevel: result.priceLevel as string | null,
                  mapsUrl: result.mapsUrl as string | null,
                  previewPhotoUrl: (result.photoUrls as string[])?.[0] || null,
                  photoUrls: result.photoUrls as string[],
                };
                setMessages(prev => {
                  const idx = prev.findIndex(m => m.id === streamingMessageId);
                  if (idx !== -1) {
                    const existing = prev[idx].functionCallPlaces || [];
                    const updated = [...prev];
                    updated[idx] = {
                      ...updated[idx],
                      functionCallPlaces: [...existing, detailPlace],
                    };
                    return updated;
                  }
                  // Create placeholder with this first place detail
                  return [
                    ...prev,
                    {
                      id: streamingMessageId,
                      type: 'assistant' as const,
                      content: '',
                      timestamp: new Date().toISOString(),
                      functionCallPlaces: [detailPlace],
                    },
                  ];
                });
              }

              // Handle concierge write actions (createPoll, createTask, savePlace, etc.)
              const writeActions = new Set([
                'createPoll',
                'createTask',
                'addToCalendar',
                'savePlace',
                'setBasecamp',
                'addToAgenda',
              ]);
              if (writeActions.has(name) && result.actionType) {
                const actionResult = {
                  actionType: result.actionType as string,
                  success: !!result.success,
                  message: (result.message as string) || (result.error as string) || '',
                  entityId:
                    ((result.poll as Record<string, unknown>)?.id as string) ||
                    ((result.task as Record<string, unknown>)?.id as string) ||
                    ((result.event as Record<string, unknown>)?.id as string) ||
                    ((result.link as Record<string, unknown>)?.id as string) ||
                    ((result.agendaItem as Record<string, unknown>)?.id as string) ||
                    undefined,
                  scope: result.scope as string | undefined,
                };
                setMessages(prev => {
                  const idx = prev.findIndex(m => m.id === streamingMessageId);
                  if (idx !== -1) {
                    const updated = [...prev];
                    const existing = updated[idx].conciergeActions || [];
                    updated[idx] = {
                      ...updated[idx],
                      conciergeActions: [...existing, actionResult],
                    };
                    return updated;
                  }
                  return [
                    ...prev,
                    {
                      id: streamingMessageId,
                      type: 'assistant' as const,
                      content: '',
                      timestamp: new Date().toISOString(),
                      conciergeActions: [actionResult],
                    },
                  ];
                });
              }
            },
            onReservationDraft: (draft: ReservationDraft) => {
              if (!isMounted.current) return;
              receivedAnyChunk = true;
              setMessages(prev => {
                const idx = prev.findIndex(m => m.id === streamingMessageId);
                if (idx !== -1) {
                  const updated = [...prev];
                  const existing = updated[idx].reservationDrafts || [];
                  updated[idx] = {
                    ...updated[idx],
                    reservationDrafts: [...existing, draft],
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: streamingMessageId,
                    type: 'assistant' as const,
                    content: '',
                    timestamp: new Date().toISOString(),
                    reservationDrafts: [draft],
                  },
                ];
              });
            },
            onSmartImportPreview: (preview: StreamSmartImportPreviewEvent) => {
              if (!isMounted.current) return;
              receivedAnyChunk = true;
              setMessages(prev => {
                const idx = prev.findIndex(m => m.id === streamingMessageId);
                const previewData = {
                  previewEvents: preview.previewEvents,
                  tripId: preview.tripId,
                  totalEvents: preview.totalEvents,
                  duplicateCount: preview.duplicateCount,
                  lodgingName: preview.lodgingName,
                };
                if (idx !== -1) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], smartImportPreview: previewData };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: streamingMessageId,
                    type: 'assistant' as const,
                    content: '',
                    timestamp: new Date().toISOString(),
                    smartImportPreview: previewData,
                  },
                ];
              });
            },
            onSmartImportStatus: (status: SmartImportStatus, message: string) => {
              if (!isMounted.current) return;
              receivedAnyChunk = true;
              setIsTyping(false);
              setMessages(prev => {
                const idx = prev.findIndex(m => m.id === streamingMessageId);
                const statusData = { status, message };
                if (idx !== -1) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], smartImportStatus: statusData };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: streamingMessageId,
                    type: 'assistant' as const,
                    content: '',
                    timestamp: new Date().toISOString(),
                    smartImportStatus: statusData,
                  },
                ];
              });
            },
            // Handles the structured JSON-envelope trip_cards event from the AI Concierge.
            // Cards are split into hotels and flights and attached to the streaming message.
            onTripCards: (cards: TripCard[], message: string | null) => {
              if (!isMounted.current) return;
              receivedAnyChunk = true;

              const hotelCards: HotelResult[] = [];
              const flightCards: ChatMessage['functionCallFlights'] = [];

              for (const card of cards) {
                if (card.type === 'hotel') {
                  hotelCards.push({
                    id: card.id,
                    provider: card.provider,
                    title: card.title,
                    subtitle: card.subtitle,
                    badges: card.badges,
                    price: card.price,
                    dates: card.dates
                      ? { check_in: card.dates.check_in, check_out: card.dates.check_out }
                      : null,
                    location: card.location
                      ? {
                          city: card.location.city,
                          region: card.location.region,
                          country: card.location.country,
                        }
                      : null,
                    details: card.details
                      ? {
                          rating: card.details.rating,
                          reviews_count: card.details.reviews_count,
                          refundable: card.details.refundable,
                          amenities: card.details.amenities,
                        }
                      : null,
                    deep_links: card.deep_links,
                  });
                } else if (card.type === 'flight') {
                  const airportCodes = card.location?.airport_codes ?? [];
                  flightCards.push({
                    origin: airportCodes[0] ?? '',
                    destination: airportCodes[1] ?? '',
                    departureDate: card.dates?.depart?.split('T')[0] ?? '',
                    returnDate: undefined,
                    passengers: 1,
                    deeplink: card.deep_links?.primary ?? '',
                    provider: card.provider,
                    price: card.price,
                    airline: card.details?.airline,
                    flightNumber: card.details?.flight_number,
                    stops: card.details?.stops,
                    durationMinutes: card.details?.duration_minutes,
                    departTime: card.dates?.depart ?? null,
                    arriveTime: card.dates?.arrive ?? null,
                    refundable: card.details?.refundable,
                  });
                }
              }

              setMessages(prev => {
                const idx = prev.findIndex(m => m.id === streamingMessageId);
                const patch: Partial<ChatMessage> = {};
                if (hotelCards.length > 0) patch.functionCallHotels = hotelCards;
                if (flightCards.length > 0) patch.functionCallFlights = flightCards;
                // If backend also sends a summary message string, use it as content
                if (message) patch.content = message;

                if (idx !== -1) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], ...patch };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: streamingMessageId,
                    type: 'assistant' as const,
                    content: message ?? '',
                    timestamp: new Date().toISOString(),
                    ...patch,
                  },
                ];
              });
            },
            onMetadata: (metadata: StreamMetadataEvent) => {
              setAiStatus('connected');
              if (isLimitedPlan) void refreshUsage();
              updateStreamMsg(() => ({
                usage: metadata.usage,
                sources: metadata.sources as ChatMessage['sources'],
                googleMapsWidget: metadata.googleMapsWidget ?? undefined,
              }));
            },
            onError: (errorMsg: string) => {
              if (import.meta.env.DEV) {
                console.error('[Stream] Concierge streaming error:', errorMsg);
              }
              if (!isMounted.current) return;
              if (!receivedAnyChunk) {
                setIsTyping(false);
                setAiStatus('degraded');
                setMessages(prev => [
                  ...prev,
                  {
                    id: streamingMessageId,
                    type: 'assistant' as const,
                    content: generateFallbackResponse(
                      currentInput,
                      fallbackContext,
                      basecampLocation,
                    ),
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
            },
            onDone: () => {
              clearTimeout(streamTimer.id);
              streamAbortRef.current = null;
              if (!isMounted.current) return;
              setIsTyping(false);
              if (!receivedAnyChunk) {
                setMessages(prev => [
                  ...prev,
                  {
                    id: streamingMessageId,
                    type: 'assistant' as const,
                    content: 'Sorry, I encountered an error processing your request.',
                    timestamp: new Date().toISOString(),
                  },
                ]);
              } else {
                updateStreamMsg(msg =>
                  msg.content.length > 0
                    ? {}
                    : { content: 'Sorry, I encountered an error processing your request.' },
                );
                // Cache the completed response for offline fallback.
                // Use the locally accumulated string — no setState read needed.
                if (accumulatedStreamContent) {
                  const latestStreamingMessage = messagesRef.current.find(
                    msg => msg.id === streamingMessageId,
                  );
                  const cachedMsg: ChatMessage = latestStreamingMessage
                    ? { ...latestStreamingMessage, content: accumulatedStreamContent }
                    : {
                        id: streamingMessageId,
                        type: 'assistant',
                        content: accumulatedStreamContent,
                        timestamp: new Date().toISOString(),
                      };
                  conciergeCacheService.cacheMessage(
                    tripId,
                    currentInput,
                    cachedMsg,
                    user?.id ?? 'anonymous',
                  );
                }
              }
            },
          },
          { demoMode: isDemoMode },
        );

        streamAbortRef.current = streamHandle.abort;
        streamingStarted = true;

        streamTimer.id = setTimeout(() => {
          if (receivedAnyChunk) return;
          streamHandle.abort();
          streamAbortRef.current = null;
          if (!isMounted.current) return;
          setAiStatus('timeout');
          setIsTyping(false);
          const timeoutContent = `⚠️ **Request timed out**\n\n${generateFallbackResponse(currentInput, fallbackContext, basecampLocation)}`;
          setMessages(prev => {
            const exists = prev.some(m => m.id === streamingMessageId);
            if (exists) {
              return prev.map(m =>
                m.id === streamingMessageId ? { ...m, content: timeoutContent } : m,
              );
            }
            return [
              ...prev,
              {
                id: streamingMessageId,
                type: 'assistant' as const,
                content: timeoutContent,
                timestamp: new Date().toISOString(),
              },
            ];
          });
        }, FAST_RESPONSE_TIMEOUT_MS);

        return;
      }

      // ========== NON-STREAMING FALLBACK (demo mode) ==========
      const { data, error } = await invokeConciergeWithTimeout(requestBody, {
        demoMode: isDemoMode,
      });

      if (!data || error) {
        if (import.meta.env.DEV) {
          console.warn('AI service unavailable or timed out, using graceful degradation');
        }
        setAiStatus('degraded');

        const fallbackResponse = generateFallbackResponse(
          currentInput,
          fallbackContext,
          basecampLocation,
        );

        const assistantMessage: ChatMessage = {
          id: _uniqueId('assistant'),
          type: 'assistant',
          content: fallbackResponse,
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      setAiStatus('connected');

      if (isLimitedPlan) {
        void refreshUsage();
      }

      const assistantMessage: ChatMessage = {
        id: _uniqueId('assistant'),
        type: 'assistant',
        content: data.response || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date().toISOString(),
        usage: data.usage,
        sources: data.sources || data.citations,
        googleMapsWidget: data.googleMapsWidget,
      };

      setMessages(prev => [...prev, assistantMessage]);
      // Persist to localStorage cache for offline fallback
      conciergeCacheService.cacheMessage(
        tripId,
        currentInput,
        assistantMessage,
        user?.id ?? 'anonymous',
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('AI Concierge error:', error);
      }
      setAiStatus('error');

      try {
        const fallbackResponse = generateFallbackResponse(
          currentInput,
          fallbackContext,
          basecampLocation,
        );
        const errorMessage: ChatMessage = {
          id: _uniqueId('assistant'),
          type: 'assistant',
          content: `⚠️ **AI Service Temporarily Unavailable**\n\n${fallbackResponse}\n\n*Note: This is a basic response. Full AI features will return once the service is restored.*`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } catch {
        const errorMessage: ChatMessage = {
          id: _uniqueId('assistant'),
          type: 'assistant',
          content: `I'm having trouble connecting to my AI services right now. Please try again in a moment.`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      if (!streamingStarted) {
        setIsTyping(false);
      }
    }
  };

  const generateFallbackResponse = (
    query: string,
    tripContext: FallbackTripContext,
    basecampLocation?: { name: string; address: string },
  ): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.match(/\b(where|location|address|directions|near|around|close)\b/)) {
      if (basecampLocation) {
        return `📍 **Location Information**\n\nBased on your trip basecamp:\n\n**${basecampLocation.name}**\n${basecampLocation.address}\n\nYou can use Google Maps to find directions and nearby places.`;
      }
      return `📍 I can help with location queries once the AI service is restored. For now, you can use the Places tab to search for locations.`;
    }

    if (lowerQuery.match(/\b(when|time|schedule|calendar|event|agenda|upcoming)\b/)) {
      if (tripContext?.itinerary?.length || tripContext?.calendar?.length) {
        const events = tripContext.itinerary || tripContext.calendar || [];
        const upcoming = events.slice(0, 3);
        let response = `📅 **Upcoming Events**\n\n`;
        upcoming.forEach(event => {
          response += `• ${event.title || event.name}`;
          if (event.startTime) response += ` - ${event.startTime}`;
          if (event.location) response += ` at ${event.location}`;
          response += `\n`;
        });
        return response;
      }
      return `📅 Check the Calendar tab for your trip schedule.`;
    }

    if (lowerQuery.match(/\b(payment|money|owe|spent|cost|budget|expense)\b/)) {
      if (tripContext?.payments?.length) {
        const unsettled = tripContext.payments.filter(p => !p.isSettled && !p.settled);
        if (unsettled.length > 0) {
          const totalOwed = unsettled.reduce((sum: number, p) => sum + (p.amount || 0), 0);
          let response = `💰 **Outstanding Payments**\n\n`;
          unsettled.slice(0, 5).forEach(p => {
            const paidBy = p.paidBy || p.createdByName || 'Someone';
            response += `• ${p.description}: $${p.amount?.toFixed(2) || '0.00'} (paid by ${paidBy})\n`;
          });
          response += `\n**Total Outstanding:** $${totalOwed.toFixed(2)}`;
          if (unsettled.length > 5) {
            response += `\n\n_...and ${unsettled.length - 5} more payments. Check the Payments tab for full details._`;
          }
          return response;
        }
        return `💰 **All Settled!**\n\nNo outstanding payments for this trip. Check the Payments tab to add new expenses.`;
      }
      return `💰 No payment data available yet. Add expenses in the Payments tab to track who owes what.`;
    }

    if (lowerQuery.match(/\b(task|todo|complete|done|pending|assigned)\b/)) {
      return `✅ Check the Tasks tab to see what needs to be completed.`;
    }

    return `I'm temporarily unavailable, but you can:\n\n• Use the **Places** tab to find locations\n• Check the **Calendar** for your schedule\n• View **Payments** for expense tracking\n• See **Tasks** for what needs to be done\n\nFull AI assistance will return shortly!`;
  };

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col px-0 py-4 overflow-hidden flex-1 min-h-0 h-full max-h-[calc(100vh-240px)]">
      <div className="rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex flex-col flex-1">
        {/* Header — search/mic aligned with input bar send button (gradient theme) */}
        <div className="border-b border-white/10 bg-black/30 p-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={CTA_BUTTON}
              aria-label="Search concierge"
            >
              <Search size={CTA_ICON_SIZE} className="text-white" />
            </button>
            <h3
              className="text-lg font-semibold text-white flex-1 text-center min-w-0"
              data-testid="ai-concierge-header"
            >
              AI Concierge
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0 min-w-fit">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                data-testid="header-upload-btn"
                className={CTA_BUTTON}
                aria-label="Attach images"
                title="Attach images"
              >
                <ImagePlus size={CTA_ICON_SIZE} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Modal */}
        <ConciergeSearchModal
          open={searchOpen}
          onOpenChange={setSearchOpen}
          tripId={tripId}
          onNavigate={(tab, id) => {
            if (tab === 'concierge' || tab === 'ai-chat') {
              const el = document.getElementById(`msg-${id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (onTabChange) {
              onTabChange(tab);
            }
          }}
        />

        {/* Hidden file input for header upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) setAttachedImages(prev => [...prev, ...files].slice(0, 4));
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />

        {/* Usage Limit Reached State */}
        {isQueryLimitReached && usage?.limit !== null && (
          <div className="text-center py-6 px-4 mb-4 flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown size={24} className="text-white" />
            </div>
            <h4 className="text-white font-medium mb-2">Trip Limit Reached</h4>
            <p className="text-sm text-gray-300 mb-4 max-w-sm mx-auto">
              You've used all {usage.limit} Concierge asks for this trip.
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              {userPlan === 'free' && (
                <Button
                  onClick={() => (window.location.href = upgradeUrl)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 w-full"
                >
                  <Crown size={16} className="mr-2" />
                  Explorer - 10 Asks/Trip ($9.99/mo)
                </Button>
              )}
              <Button
                onClick={() => (window.location.href = upgradeUrl)}
                variant="outline"
                className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-500/50 hover:bg-purple-500/30 w-full"
              >
                <Sparkles size={16} className="mr-2" />
                Frequent Chraveler - Unlimited ($19.99/mo)
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Your previous conversations are saved and will remain accessible.
            </p>
          </div>
        )}

        {/* History loading skeleton — prevents flash of empty → populated */}
        {isHistoryLoading && messages.length === 0 && !isQueryLimitReached && (
          <div className="flex flex-col gap-3 p-4 animate-pulse flex-shrink-0">
            <div className="h-8 bg-white/10 rounded-xl w-3/4" />
            <div className="h-8 bg-white/10 rounded-xl w-1/2 self-end" />
            <div className="h-8 bg-white/10 rounded-xl w-2/3" />
          </div>
        )}

        {/* Empty State - Compact for Mobile */}
        {messages.length === 0 && !isHistoryLoading && !isQueryLimitReached && (
          <div className="text-center py-6 px-4 flex-shrink-0">
            <h4 className="text-base font-semibold mb-1.5 text-white sm:text-lg sm:mb-2">
              Your Travel Concierge
            </h4>
            <div className="text-sm text-gray-300 space-y-1 max-w-md mx-auto">
              <p className="text-xs sm:text-sm mb-1.5">Ask me anything:</p>
              <div className="text-xs text-gray-400 space-y-0.5 leading-snug">
                <p>• "What's the Lakers schedule this week?"</p>
                <p>• "Suggest activities based on our preferences"</p>
                <p>• "What's in the calendar agenda for the rest of the week"</p>
                <p>• "What tasks still need to be completed"</p>
                <p>• "Can you summarize my payments owed?"</p>
              </div>
              <div className="mt-2 text-xs text-green-400 bg-green-500/10 rounded px-2.5 py-1 inline-block">
                ✨ Powered by AI - ask me anything!
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto p-4 chat-scroll-container native-scroll min-h-0"
        >
          {/* "Picked up where you left off" divider — shown once when server history hydrates */}
          {historyLoadedFromServer && messages.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                ↩ Picked up where you left off
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          )}
          {/* Merge transient streaming bubbles into the message list so both the
               user's live STT and the assistant's live TTS are visible in the
               chat while Gemini Live is active.  Order: persisted messages →
               user interim bubble (while listening) → assistant streaming bubble
               (while playing).  handleLiveTurnComplete clears both transient
               entries and appends the finalised messages, so there is no
               duplication or flash. */}
          {(messages.length > 0 || !!streamingVoiceMessage || !!streamingUserMessage) && (
            <ChatMessages
              messages={[
                ...messages,
                ...(streamingUserMessage ? [streamingUserMessage] : []),
                ...(streamingVoiceMessage ? [streamingVoiceMessage] : []),
              ]}
              isTyping={isTyping}
              showMapWidgets={true}
              onDeleteMessage={handleDeleteMessage}
              onTabChange={onTabChange}
              onSavePlace={savePlace}
              onSaveFlight={saveFlight}
              onSaveHotel={saveHotel}
              isUrlSaved={isUrlSaved}
              isSaving={isSaving}
              onEditReservation={(prefill: string) => {
                setInputMessage(prefill);
              }}
              onSmartImportConfirm={handleSmartImportConfirm}
              onSmartImportDismiss={handleSmartImportDismiss}
              smartImportStates={smartImportStates}
            />
          )}
        </div>

        {/* Voice listening indicator (dictation mode) */}
        {dictationState === 'listening' && (
          <div
            className="flex items-center justify-between px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex-shrink-0"
            role="alert"
            aria-live="polite"
            aria-label="Listening for dictation"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                aria-hidden="true"
              />
              <span className="text-sm text-emerald-300">Listening...</span>
            </div>
            <button
              type="button"
              onClick={stopDictation}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded"
              aria-label="Stop listening"
            >
              Stop
            </button>
          </div>
        )}

        {/* Input area — sticky bottom with inline voice banner above input */}
        <div
          className="chat-composer sticky bottom-0 z-10 bg-black/30 px-3 pt-2 flex-shrink-0"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
        >
          {/* Gemini Live voice banner — inline above input, chat stays visible */}
          {liveOverlayOpen && (
            <VoiceLiveOverlay
              state={liveState}
              userTranscript={liveUserTranscript}
              assistantTranscript={liveAssistantTranscript}
              error={liveError}
              circuitBreakerOpen={liveCircuitBreakerOpen}
              onEnd={handleEndLiveSession}
              onResetCircuitBreaker={resetLiveCircuitBreaker}
            />
          )}
          <AiChatInput
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            onSendMessage={() => {
              void handleSendMessage();
            }}
            onKeyPress={handleKeyPress}
            isTyping={isTyping}
            disabled={isQueryLimitReached}
            showImageAttach={UPLOAD_ENABLED}
            attachedImages={UPLOAD_ENABLED ? attachedImages : []}
            onImageAttach={
              UPLOAD_ENABLED
                ? (files: File[]) => setAttachedImages(prev => [...prev, ...files].slice(0, 4))
                : undefined
            }
            onRemoveImage={
              UPLOAD_ENABLED
                ? idx => setAttachedImages(prev => prev.filter((_, i) => i !== idx))
                : undefined
            }
            convoVoiceState={convoVoiceState}
            onConvoToggle={handleConvoToggle}
            dictationVoiceState={dictationState}
            onDictationToggle={handleDictationToggle}
            isVoiceEligible={true}
            onQuickAction={
              UPLOAD_ENABLED && attachedImages.length > 0
                ? (action: string) => {
                    const actionMessages: Record<string, string> = {
                      add_to_calendar: 'Add this to the trip calendar',
                      save_to_trip: 'Save this to the trip',
                      create_tasks: 'Create tasks from this',
                    };
                    const msg = actionMessages[action] || 'Analyze this';
                    setInputMessage(msg);
                    void handleSendMessage(msg);
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
};
