import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
} from '@/services/conciergeGateway';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useWebSpeechVoice } from '@/hooks/useWebSpeechVoice';
import type { VoiceState } from '@/hooks/useWebSpeechVoice';
import { supabase } from '@/integrations/supabase/client';
import { useConciergeSessionStore, type ConciergeSession } from '@/store/conciergeSessionStore';

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
// Voice is now dictation-only (Web Speech API). Gemini Live duplex is disabled.
// ─────────────────────────────────────────────────────────────────────────────

interface AIConciergeChatProps {
  tripId: string;
  basecamp?: { name: string; address: string };
  preferences?: TripPreferences;
  isDemoMode?: boolean;
  isEvent?: boolean;
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
  }>;
  /** Action results from concierge write tools (createPoll, createTask, etc.) */
  conciergeActions?: Array<{
    actionType: string;
    success: boolean;
    message: string;
    entityId?: string;
    entityName?: string;
    scope?: string;
  }>;
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

  // Hydrate from Zustand store on mount (preserves messages across tab switches)
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    storeSession.messages.length > 0 ? (storeSession.messages as ChatMessage[]) : [],
  );
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

  // ─── Voice (Dictation-Only — Web Speech API) ─────────────────────────────
  // Microphone captures speech → text → populates input field (auto-sends).
  // No model audio output. No duplex WebSocket. No barge-in.
  const handleDictationResult = useCallback((text: string) => {
    if (!text.trim()) return;
    // Insert text into input field only — user reviews and sends manually
    setInputMessage(prev => (prev ? prev + ' ' + text.trim() : text.trim()));
  }, []);

  const {
    voiceState: dictationState,
    toggleVoice: toggleDictation,
    errorMessage: dictationError,
  } = useWebSpeechVoice(handleDictationResult);

  // Map dictation state to the VoiceState type used by VoiceButton
  const effectiveVoiceState: VoiceState = dictationState;

  // Show dictation errors as toasts
  useEffect(() => {
    if (dictationError) {
      toast.error('Voice error', { description: dictationError });
    }
  }, [dictationError]);

  const handleVoiceToggle = useCallback(() => {
    toggleDictation();
  }, [toggleDictation]);
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
    if (messages.length > 0) {
      setStoreMessages(
        tripId,
        messages as import('@/store/conciergeSessionStore').ConciergeSessionMessage[],
      );
    }
  }, [messages, tripId, setStoreMessages]);

  // Auto-scroll to bottom when new messages or typing indicator appear
  useEffect(() => {
    if (chatScrollRef.current && (messages.length > 0 || isTyping)) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages.length, isTyping, messages]);

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

  const queryAllowanceText = useMemo(() => {
    if (!usage) {
      return 'Loading query allowance...';
    }

    if (usage.limit === null) {
      return 'unlimited asks';
    }

    return `${usage.remaining}/${usage.limit} Asks`;
  }, [usage]);

  const queryAllowanceTone = useMemo(() => {
    if (!usage || usage.limit === null) {
      return 'text-gray-300';
    }
    if (usage.isLimitReached) {
      return 'text-red-300';
    }
    if ((usage.remaining ?? 0) <= 2) {
      return 'text-orange-300';
    }
    return 'text-gray-300';
  }, [usage]);

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
      id: Date.now().toString(),
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
        const streamingMessageId = `stream-${Date.now()}`;
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
                };
                ensureAndPatch({
                  functionCallFlights: [flightResult],
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
                  const cachedMsg: ChatMessage = {
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
          id: (Date.now() + 1).toString(),
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
        id: (Date.now() + 1).toString(),
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
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `⚠️ **AI Service Temporarily Unavailable**\n\n${fallbackResponse}\n\n*Note: This is a basic response. Full AI features will return once the service is restored.*`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } catch {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
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
              className="size-11 min-w-[44px] bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
              aria-label="Search concierge"
            >
              <Search size={18} className="text-white" />
            </button>
            <span
              className={`text-xs whitespace-nowrap max-w-[140px] truncate ${queryAllowanceTone}`}
            >
              {queryAllowanceText}
            </span>
            <h3 className="text-lg font-semibold text-white flex-1 text-center min-w-0">
              AI Concierge
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0 min-w-fit">
              <p className="text-xs text-gray-400 whitespace-nowrap">Private Convo</p>

              {/* Voice button in header for always-on accessibility - Force Update */}
              <button
                type="button"
                onClick={handleVoiceToggle}
                data-testid="header-voice-mic"
                className={`size-11 min-w-[44px] bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20 ${
                  dictationState === 'listening' ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black' : ''
                }`}
                aria-label="Voice concierge"
                title="Voice concierge"
              >
                <div className={`w-3 h-3 rounded-full ${dictationState === 'listening' ? 'bg-red-500 animate-pulse' : 'bg-white'}`} />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                data-testid="header-upload-btn"
                className="size-11 min-w-[44px] bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                aria-label="Attach images"
                title="Attach images"
              >
                <ImagePlus size={18} className="text-white" />
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
              Your AI Travel Concierge
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
          {messages.length > 0 && (
            <ChatMessages
              messages={messages}
              isTyping={isTyping}
              showMapWidgets={true}
              onDeleteMessage={handleDeleteMessage}
              onTabChange={onTabChange}
              onSavePlace={async place => {
                // Optimistically add to UI, then call savePlace tool or backend
                // For now, we'll trigger a message to the AI to save it
                const savePrompt = `Save "${place.name}" to trip places. URL: ${place.mapsUrl || ''}`;
                handleSendMessage(savePrompt);
              }}
              onSaveFlight={async flight => {
                // Optimistically add to UI, then call savePlace tool or backend
                // For now, we'll trigger a message to the AI to save it
                const savePrompt = `Save flight from ${flight.origin} to ${flight.destination} departing ${flight.departureDate}. URL: ${flight.deeplink}`;
                handleSendMessage(savePrompt);
              }}
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
              onClick={toggleDictation}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded"
              aria-label="Stop listening"
            >
              Stop
            </button>
          </div>
        )}

        {/* Input — uses existing AiChatInput with voice props wired to Gemini Live */}
        <div className="chat-composer sticky bottom-0 z-10 bg-black/30 px-3 py-2 pb-[env(safe-area-inset-bottom)] flex-shrink-0">
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
            voiceState={effectiveVoiceState}
            isVoiceEligible={true}
            onVoiceToggle={handleVoiceToggle}
          />
        </div>
      </div>
    </div>
  );
};
