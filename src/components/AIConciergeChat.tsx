import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, Search, AlertCircle, Crown, Clock, Sparkles, Mic, Radio } from 'lucide-react';
import { useConsumerSubscription } from '../hooks/useConsumerSubscription';
import { TripPreferences } from '../types/consumer';
import { useBasecamp } from '../contexts/BasecampContext';
import { ChatMessages } from '@/features/chat/components/ChatMessages';
import { AiChatInput } from '@/features/chat/components/AiChatInput';
import { conciergeRateLimitService } from '../services/conciergeRateLimitService';
import { useAuth } from '../hooks/useAuth';
import { useConciergeUsage } from '../hooks/useConciergeUsage';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useUnifiedEntitlements } from '../hooks/useUnifiedEntitlements';
import { useWebSpeechVoice as useGeminiVoice } from '../hooks/useWebSpeechVoice';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { invokeConcierge } from '@/services/conciergeGateway';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { conciergeCacheService } from '../services/conciergeCacheService';

interface AIConciergeChatProps {
  tripId: string;
  basecamp?: { name: string; address: string };
  preferences?: TripPreferences;
  isDemoMode?: boolean;
  isEvent?: boolean; // 🆕 Flag for event-specific rate limiting
}

interface ChatMessage {
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
    source?: string; // 🆕 Track if from Google Maps grounding
  }>;
  googleMapsWidget?: string; // 🆕 Widget context token
}

interface ConciergeInvokePayload {
  response?: string;
  usage?: ChatMessage['usage'];
  sources?: ChatMessage['sources'];
  citations?: ChatMessage['sources'];
  googleMapsWidget?: string;
}

interface ConciergeAttachment {
  mimeType: string;
  data: string;
  name?: string;
}

const FAST_RESPONSE_TIMEOUT_MS = 30000;

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
): Promise<{ data: ConciergeInvokePayload | null; error: { message?: string } | null }> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('AI request timed out'));
    }, FAST_RESPONSE_TIMEOUT_MS);
  });

  try {
    const response = (await Promise.race([invokeConcierge(requestBody), timeoutPromise])) as {
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
  isEvent = false,
}: AIConciergeChatProps) => {
  const {
    isPlus,
    tier: consumerTier,
    isLoading: isConsumerSubscriptionLoading,
  } = useConsumerSubscription();
  const { basecamp: globalBasecamp } = useBasecamp();
  const { user } = useAuth();
  const { usage, getUsageStatus, isFreeUser, upgradeUrl } = useConciergeUsage(tripId);
  const { isOffline } = useOfflineStatus();
  const {
    canUse,
    isPro,
    isSuperAdmin,
    isLoading: isEntitlementsLoading,
  } = useUnifiedEntitlements();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<
    'checking' | 'connected' | 'limited' | 'error' | 'thinking' | 'offline' | 'degraded' | 'timeout'
  >('connected');
  const [remainingQueries, setRemainingQueries] = useState<number>(Infinity);
  const [isUsingCachedResponse, setIsUsingCachedResponse] = useState(false);
  const [isLiveVoiceMode, setIsLiveVoiceMode] = useState(false);
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const liveFallbackHandledRef = useRef(false);

  // Voice: eligibility and hook
  const hasLegacySubscriptionVoiceAccess =
    String(consumerTier) === 'frequent-chraveler' || String(consumerTier).startsWith('pro-');
  const isVoiceEligible =
    isEntitlementsLoading ||
    isConsumerSubscriptionLoading ||
    canUse('voice_concierge') ||
    isPlus ||
    isPro ||
    isSuperAdmin ||
    isDemoMode ||
    hasLegacySubscriptionVoiceAccess;

  const [voicePendingText, setVoicePendingText] = useState<string | null>(null);

  // Voice transcripts are queued and sent through handleSendMessage (same pipeline as typed text)
  const handleVoiceUserMessage = useCallback((text: string) => {
    const transcript = text.trim();
    if (!transcript) return;
    setVoicePendingText(transcript);
  }, []);

  const {
    voiceState: webSpeechVoiceState,
    errorMessage: voiceError,
    toggleVoice: toggleWebSpeechVoice,
    stopVoice: stopWebSpeechVoice,
  } = useGeminiVoice(handleVoiceUserMessage);

  // Gemini Live voice hook (direct WebSocket to Gemini)
  const {
    state: geminiLiveState,
    error: geminiLiveError,
    startSession: connectGeminiLive,
    endSession: disconnectGeminiLive,
  } = useGeminiLive({ tripId });

  // Unified voice state: use Gemini Live when in live mode, Web Speech otherwise
  const voiceState = isLiveVoiceMode ? geminiLiveState : webSpeechVoiceState;
  const currentVoiceError = isLiveVoiceMode ? geminiLiveError : voiceError;

  const toggleVoice = useCallback(() => {
    if (isLiveVoiceMode) {
      if (geminiLiveState === 'idle' || geminiLiveState === 'error') {
        connectGeminiLive();
      } else {
        disconnectGeminiLive();
      }
    } else {
      toggleWebSpeechVoice();
    }
  }, [
    isLiveVoiceMode,
    geminiLiveState,
    connectGeminiLive,
    disconnectGeminiLive,
    toggleWebSpeechVoice,
  ]);

  const toggleLiveVoiceMode = useCallback(() => {
    // Stop any active voice session before switching
    if (isLiveVoiceMode) {
      disconnectGeminiLive();
    } else {
      stopWebSpeechVoice();
    }
    setIsLiveVoiceMode(prev => !prev);
  }, [isLiveVoiceMode, disconnectGeminiLive, stopWebSpeechVoice]);

  useEffect(() => {
    return () => {
      stopWebSpeechVoice();
      disconnectGeminiLive();
    };
  }, [stopWebSpeechVoice, disconnectGeminiLive]);

  useEffect(() => {
    if (!isLiveVoiceMode || geminiLiveState !== 'error' || liveFallbackHandledRef.current) {
      return;
    }

    liveFallbackHandledRef.current = true;
    setIsLiveVoiceMode(false);

    // Automatically fall back to Web Speech mode when Gemini Live fails.
    // This keeps voice UX available without forcing a manual mode switch.
    setTimeout(() => {
      if (webSpeechVoiceState === 'idle' || webSpeechVoiceState === 'error') {
        toggleWebSpeechVoice();
      }
    }, 0);
  }, [isLiveVoiceMode, geminiLiveState, webSpeechVoiceState, toggleWebSpeechVoice]);

  useEffect(() => {
    if (!isLiveVoiceMode) {
      liveFallbackHandledRef.current = false;
    }
  }, [isLiveVoiceMode]);

  // Auto-send voice transcripts through the same pipeline as typed messages
  useEffect(() => {
    if (!voicePendingText || isTyping) return;
    void handleSendMessage(voicePendingText);
    setVoicePendingText(null);
  }, [voicePendingText, isTyping]);

  // PHASE 1 BUG FIX #7: Add mounted ref to prevent state updates after unmount
  const isMounted = useRef(true);

  // Helper to convert isPlus boolean to tier string
  const getUserTier = useCallback((): 'free' | 'plus' | 'pro' => {
    if (user?.isPro) return 'pro';
    if (isPlus) return 'plus';
    return 'free';
  }, [user?.isPro, isPlus]);

  // PHASE 1 BUG FIX #7: Set up cleanup to track component mount state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ⚡ PERFORMANCE: 8-second initialization timeout to prevent indefinite loading
  useEffect(() => {
    // If we're already connected or have messages, no need for timeout
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

  // Initialize remaining queries for events and load cached messages
  useEffect(() => {
    if (isEvent && user) {
      conciergeRateLimitService
        .getRemainingQueries(user.id, tripId, getUserTier())
        .then(remaining => {
          // PHASE 1 BUG FIX #7: Only update state if component is still mounted
          if (isMounted.current) {
            setRemainingQueries(remaining);
          }
        })
        .catch(err => {
          if (import.meta.env.DEV) {
            console.error('Failed to get remaining queries:', err);
          }
        });
    }

    // Load cached messages for offline mode (user-isolated)
    const cachedMessages = conciergeCacheService.getCachedMessages(tripId, user?.id);
    if (cachedMessages && cachedMessages.length > 0 && isMounted.current) {
      setMessages(cachedMessages);
    }
  }, [isEvent, user, tripId, isPlus, getUserTier]);

  // Monitor offline status
  useEffect(() => {
    if (isOffline) {
      setAiStatus('offline');
    } else if (aiStatus === 'offline') {
      setAiStatus('connected');
    }
  }, [isOffline, aiStatus]);

  const handleSendMessage = async (messageOverride?: string) => {
    const typedMessage = (messageOverride ?? inputMessage).trim();
    const selectedImages = [...attachedImages];
    const hasImageAttachments = selectedImages.length > 0;
    if ((!typedMessage && !hasImageAttachments) || isTyping) return;

    const messageToSend =
      typedMessage || `Please analyze the ${selectedImages.length} attached image(s).`;
    const userDisplayContent =
      typedMessage ||
      `📎 Attached ${selectedImages.length} image${selectedImages.length === 1 ? '' : 's'}`;

    // Check offline mode first
    if (isOffline) {
      // Try to get cached response for similar query (user-isolated)
      const cachedResponse = conciergeCacheService.getCachedResponse(
        tripId,
        messageToSend,
        user?.id,
      );
      if (cachedResponse) {
        setIsUsingCachedResponse(true);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'user',
            content: messageToSend,
            timestamp: new Date().toISOString(),
          },
          {
            ...cachedResponse,
            id: (Date.now() + 1).toString(),
            timestamp: new Date().toISOString(),
          },
        ]);
        if (!messageOverride) {
          setInputMessage('');
        }
        return;
      } else {
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
              "📡 **Offline Mode**\n\nI'm currently offline and don't have a cached response for this query. Please check your connection and try again when online.",
            timestamp: new Date().toISOString(),
          },
        ]);
        if (!messageOverride) {
          setInputMessage('');
        }
        return;
      }
    }

    // 🆕 Rate limit check for events (per-trip, no daily reset)
    if (isEvent && user) {
      const canQuery = await conciergeRateLimitService.canQuery(user.id, tripId, getUserTier());
      if (!canQuery) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'assistant',
            content: `⚠️ **Trip Limit Reached**\n\nYou've used all ${getUserTier() === 'free' ? 5 : 10} AI Concierge queries for this trip.\n\n💎 Upgrade to ${getUserTier() === 'free' ? 'Explorer for 10 queries per trip' : 'Frequent Chraveler for unlimited AI assistance'}!`,
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }
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

    // Lightweight fallback context is used only for graceful degradation messages.
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

    try {
      let attachments: ConciergeAttachment[] = [];
      if (selectedImages.length > 0) {
        attachments = await Promise.all(selectedImages.map(fileToAttachmentPayload));
      }

      // Build chat history for context - truncate each message to prevent validation overflow
      const MAX_MESSAGE_LENGTH = 3000; // Keep under 20000 limit with room for multiple messages
      const chatHistory = messages.slice(-6).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content:
          msg.content.length > MAX_MESSAGE_LENGTH
            ? msg.content.substring(0, MAX_MESSAGE_LENGTH) + '...[truncated]'
            : msg.content,
      }));

      const { data, error } = await invokeConciergeWithTimeout({
        message: currentInput,
        tripId,
        preferences,
        chatHistory,
        attachments,
        isDemoMode,
        // Force flash path for predictable low-latency responses.
        config: {
          model: 'gemini-3-flash-preview',
          temperature: 0.55,
          maxTokens: 1024,
        },
      });

      // Graceful degradation: If AI service unavailable, provide helpful fallback
      if (!data || error) {
        if (import.meta.env.DEV) {
          console.warn('AI service unavailable or timed out, using graceful degradation');
        }
        setAiStatus('degraded');

        // Try to provide context-aware fallback response
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
        conciergeCacheService.cacheMessage(tripId, currentInput, assistantMessage, user?.id);
        setIsTyping(false);
        return;
      }

      setAiStatus('connected');
      setIsUsingCachedResponse(false);

      // 🆕 Increment usage for events (per-trip, no daily reset)
      if (isEvent && user) {
        try {
          await conciergeRateLimitService.incrementUsage(user.id, tripId, getUserTier());
          const remaining = await conciergeRateLimitService.getRemainingQueries(
            user.id,
            tripId,
            getUserTier(),
          );
          // PHASE 1 BUG FIX #7: Only update state if component is still mounted
          if (isMounted.current) {
            setRemainingQueries(remaining);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to increment usage:', error);
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date().toISOString(),
        usage: data.usage,
        sources: data.sources || data.citations,
        googleMapsWidget: data.googleMapsWidget, // 🆕 Pass widget token
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Cache the response for offline mode (user-isolated)
      conciergeCacheService.cacheMessage(tripId, currentInput, assistantMessage, user?.id);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ AI Concierge error:', error);
      }
      setAiStatus('error');

      // Try graceful degradation
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
        conciergeCacheService.cacheMessage(tripId, currentInput, errorMessage, user?.id);
      } catch {
        // Ultimate fallback
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `I'm having trouble connecting to my AI services right now. Please try again in a moment.`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  // Generate fallback response when AI is unavailable
  const generateFallbackResponse = (
    query: string,
    tripContext: any,
    basecampLocation?: { name: string; address: string },
  ): string => {
    const lowerQuery = query.toLowerCase();

    // Location-based queries
    if (lowerQuery.match(/\b(where|location|address|directions|near|around|close)\b/)) {
      if (basecampLocation) {
        return `📍 **Location Information**\n\nBased on your trip basecamp:\n\n**${basecampLocation.name}**\n${basecampLocation.address}\n\nYou can use Google Maps to find directions and nearby places.`;
      }
      return `📍 I can help with location queries once the AI service is restored. For now, you can use the Places tab to search for locations.`;
    }

    // Calendar/event queries
    if (lowerQuery.match(/\b(when|time|schedule|calendar|event|agenda|upcoming)\b/)) {
      if (tripContext?.itinerary?.length || tripContext?.calendar?.length) {
        const events = tripContext.itinerary || tripContext.calendar || [];
        const upcoming = events.slice(0, 3);
        let response = `📅 **Upcoming Events**\n\n`;
        upcoming.forEach((event: any) => {
          response += `• ${event.title || event.name}`;
          if (event.startTime) response += ` - ${event.startTime}`;
          if (event.location) response += ` at ${event.location}`;
          response += `\n`;
        });
        return response;
      }
      return `📅 Check the Calendar tab for your trip schedule.`;
    }

    // Payment queries - provide actual payment data from context
    if (lowerQuery.match(/\b(payment|money|owe|spent|cost|budget|expense)\b/)) {
      if (tripContext?.payments?.length) {
        const unsettled = tripContext.payments.filter((p: any) => !p.isSettled && !p.settled);
        if (unsettled.length > 0) {
          const totalOwed = unsettled.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
          let response = `💰 **Outstanding Payments**\n\n`;
          unsettled.slice(0, 5).forEach((p: any) => {
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

    // Task queries
    if (lowerQuery.match(/\b(task|todo|complete|done|pending|assigned)\b/)) {
      return `✅ Check the Tasks tab to see what needs to be completed.`;
    }

    // Default helpful response
    return `I'm temporarily unavailable, but you can:\n\n• Use the **Places** tab to find locations\n• Check the **Calendar** for your schedule\n• View **Payments** for expense tracking\n• See **Tasks** for what needs to be done\n\nFull AI assistance will return shortly!`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col px-0 py-4 overflow-hidden flex-1 min-h-0">
      <div className="rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex flex-col flex-1">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/30 p-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Search size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">AI Concierge</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {voiceState === 'listening' ? (
                    <>
                      <Mic size={16} className="text-green-400" />
                      <span className="text-xs text-green-400">
                        {isLiveVoiceMode ? 'Live Listening...' : 'Listening...'}
                      </span>
                    </>
                  ) : voiceState === 'thinking' ? (
                    <>
                      <Mic size={16} className="text-purple-400" />
                      <span className="text-xs text-purple-400">Thinking...</span>
                    </>
                  ) : voiceState === 'speaking' ? (
                    <>
                      <Mic size={16} className="text-blue-400" />
                      <span className="text-xs text-blue-400">Speaking... Tap to interrupt</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} className="text-green-400" />
                      <span className="text-xs text-green-400">Ready with Web Search</span>
                    </>
                  )}
                </div>

                {/* Gemini Live toggle */}
                {isVoiceEligible && (
                  <button
                    onClick={toggleLiveVoiceMode}
                    className={`flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs transition-all ${
                      isLiveVoiceMode
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-white/5 text-neutral-400 border border-white/10 hover:text-white hover:bg-white/10'
                    }`}
                    aria-label={
                      isLiveVoiceMode ? 'Switch to text voice' : 'Switch to Gemini Live voice'
                    }
                  >
                    <Radio size={12} />
                    {isLiveVoiceMode ? 'Live' : 'Live'}
                  </button>
                )}

                {/* Usage status for free users */}
                {isFreeUser && usage && (
                  <div className="flex items-center gap-2 ml-2">
                    <Badge
                      variant={
                        getUsageStatus().status === 'limit_reached'
                          ? 'destructive'
                          : getUsageStatus().status === 'warning'
                            ? 'secondary'
                            : 'default'
                      }
                      className="text-xs"
                    >
                      {getUsageStatus().message}
                    </Badge>
                    {getUsageStatus().status === 'limit_reached' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-6 px-2"
                        onClick={() => window.open(upgradeUrl, '_blank')}
                      >
                        <Crown size={12} className="mr-1" />
                        Upgrade
                      </Button>
                    )}
                  </div>
                )}

                {/* Rate limit indicator for events */}
                {isEvent && !isPlus && user && remainingQueries !== Infinity && (
                  <div className="flex items-center gap-1 ml-2">
                    <AlertCircle
                      size={16}
                      className={remainingQueries <= 2 ? 'text-orange-400' : 'text-blue-400'}
                    />
                    <span
                      className={`text-xs ${remainingQueries <= 2 ? 'text-orange-400' : 'text-blue-400'}`}
                    >
                      {remainingQueries} {remainingQueries === 1 ? 'query' : 'queries'} left for
                      this trip
                    </span>
                  </div>
                )}

                {/* Offline indicator */}
                {isOffline && (
                  <div className="flex items-center gap-1 ml-2">
                    <AlertCircle size={16} className="text-yellow-400" />
                    <span className="text-xs text-yellow-400">Offline Mode</span>
                  </div>
                )}

                {/* Degraded mode indicator */}
                {aiStatus === 'degraded' && (
                  <div className="flex items-center gap-1 ml-2">
                    <AlertCircle size={16} className="text-orange-400" />
                    <span className="text-xs text-orange-400">Limited Mode</span>
                  </div>
                )}

                {/* Cached response indicator */}
                {isUsingCachedResponse && (
                  <div className="flex items-center gap-1 ml-2">
                    <Clock size={16} className="text-blue-400" />
                    <span className="text-xs text-blue-400">Cached</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Usage Limit Reached State */}
        {isFreeUser && usage?.isLimitReached && (
          <div className="text-center py-6 px-4 mb-4 flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown size={24} className="text-white" />
            </div>
            <h4 className="text-white font-medium mb-2">Trip Limit Reached</h4>
            <p className="text-sm text-gray-300 mb-4 max-w-sm mx-auto">
              You've used all {usage.limit} free AI queries for this trip. Upgrade to keep planning!
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Button
                onClick={() => (window.location.href = upgradeUrl)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 w-full"
              >
                <Crown size={16} className="mr-2" />
                Explorer - 10 Queries/Trip ($9.99/mo)
              </Button>
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

        {/* Empty State - Compact for Mobile */}
        {messages.length === 0 && !(isFreeUser && usage?.isLimitReached) && (
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

        {/* Chat Messages + Streaming Voice Transcript */}
        <div className="flex-1 overflow-y-auto p-4 chat-scroll-container native-scroll">
          {messages.length > 0 && (
            <ChatMessages messages={messages} isTyping={isTyping} showMapWidgets={true} />
          )}

          {/* Voice error inline display */}
          {currentVoiceError && voiceState === 'error' && (
            <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-300">{currentVoiceError}</span>
            </div>
          )}

          {/* Gemini Live active indicator */}
          {isLiveVoiceMode && geminiLiveState !== 'idle' && (
            <div className="flex items-center justify-center gap-2 px-3 py-3 mt-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Radio size={16} className="text-purple-400" />
              <span className="text-sm text-purple-300">
                {geminiLiveState === 'connecting' && 'Connecting to Gemini Live...'}
                {geminiLiveState === 'listening' && 'Gemini Live — Listening...'}
                {geminiLiveState === 'speaking' && 'Gemini Live — Speaking...'}
                {geminiLiveState === 'error' && 'Gemini Live — Error'}
              </span>
            </div>
          )}
        </div>

        {/* Input with privacy indicator */}
        <div className="chat-composer sticky bottom-0 z-10 bg-black/30 px-3 py-2 pb-[env(safe-area-inset-bottom)] flex-shrink-0">
          <AiChatInput
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            isTyping={isTyping}
            disabled={isFreeUser && usage?.isLimitReached}
            usageStatus={getUsageStatus()}
            onUpgradeClick={() => (window.location.href = upgradeUrl)}
            voiceState={voiceState}
            isVoiceEligible={isVoiceEligible}
            onVoiceToggle={toggleVoice}
            onVoiceUpgrade={() => (window.location.href = upgradeUrl)}
            showImageAttach={true}
            attachedImages={attachedImages}
            onImageAttach={files => setAttachedImages(prev => [...prev, ...files].slice(0, 4))}
            onRemoveImage={idx => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
          />
          <div className="text-center mt-1">
            <span className="text-xs text-gray-500">🔒 This conversation is private to you</span>
          </div>
        </div>
      </div>
    </div>
  );
};
