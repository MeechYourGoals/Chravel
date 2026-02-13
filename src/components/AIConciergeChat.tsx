import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, AlertCircle, Crown, Sparkles } from 'lucide-react';
import { useConsumerSubscription } from '../hooks/useConsumerSubscription';
import { TripPreferences } from '../types/consumer';
import { useBasecamp } from '../contexts/BasecampContext';
import { ChatMessages } from '@/features/chat/components/ChatMessages';
import { AiChatInput } from '@/features/chat/components/AiChatInput';
import { useConciergeUsage } from '../hooks/useConciergeUsage';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useUnifiedEntitlements } from '../hooks/useUnifiedEntitlements';
import { useWebSpeechVoice as useGeminiVoice } from '../hooks/useWebSpeechVoice';
import { invokeConcierge } from '@/services/conciergeGateway';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface AIConciergeChatProps {
  tripId: string;
  basecamp?: { name: string; address: string };
  preferences?: TripPreferences;
  isDemoMode?: boolean;
  isEvent?: boolean; // Deprecated: retained for backward compatibility
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
}: AIConciergeChatProps) => {
  const {
    isPlus,
    tier: consumerTier,
    isLoading: isConsumerSubscriptionLoading,
  } = useConsumerSubscription();
  const { basecamp: globalBasecamp } = useBasecamp();
  const { usage, refreshUsage, isLimitedPlan, userPlan, upgradeUrl } = useConciergeUsage(tripId);
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
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const handleSendMessageRef = useRef<(messageOverride?: string) => Promise<void>>(async () =>
    Promise.resolve(),
  );
  const hasShownLimitToastRef = useRef(false);

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

  const voiceState = webSpeechVoiceState;
  const currentVoiceError = voiceError;
  const toggleVoice = toggleWebSpeechVoice;

  useEffect(() => {
    return () => {
      stopWebSpeechVoice();
    };
  }, [stopWebSpeechVoice]);

  // Auto-send voice transcripts through the same pipeline as typed messages
  useEffect(() => {
    if (!voicePendingText || isTyping) return;
    void handleSendMessageRef.current(voicePendingText);
    setVoicePendingText(null);
  }, [voicePendingText, isTyping]);

  // PHASE 1 BUG FIX #7: Add mounted ref to prevent state updates after unmount
  const isMounted = useRef(true);

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

  const isQueryLimitReached = Boolean(isLimitedPlan && usage?.isLimitReached);

  const queryAllowanceText = useMemo(() => {
    if (!usage) {
      return 'Loading query allowance...';
    }

    if (usage.limit === null) {
      return 'Unlimited queries';
    }

    return `Queries: ${usage.remaining}/${usage.limit}`;
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
        ? "You've used all 5 Concierge queries for this trip."
        : "You've used all 10 Concierge queries for this trip.";
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

    if (isLimitedPlan) {
      const latestUsage = await refreshUsage();

      if (!latestUsage) {
        toast.error('Unable to verify Concierge query allowance right now. Please try again.');
        return;
      }

      if (latestUsage.isLimitReached && latestUsage.limit !== null) {
        showLimitReachedToast(latestUsage.plan === 'explorer' ? 'explorer' : 'free');
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

      const { data, error } = await invokeConciergeWithTimeout(
        {
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
        },
        { demoMode: isDemoMode },
      );

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
        googleMapsWidget: data.googleMapsWidget, // 🆕 Pass widget token
      };

      setMessages(prev => [...prev, assistantMessage]);
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
    tripContext: FallbackTripContext,
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

    // Payment queries - provide actual payment data from context
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

    // Task queries
    if (lowerQuery.match(/\b(task|todo|complete|done|pending|assigned)\b/)) {
      return `✅ Check the Tasks tab to see what needs to be completed.`;
    }

    // Default helpful response
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
    <div className="flex flex-col px-0 py-4 overflow-hidden flex-1 min-h-0">
      <div className="rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex flex-col flex-1">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/30 p-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Search size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white">AI Concierge</h3>
              <p className="text-xs text-gray-400">🔒 This conversation is private to you</p>
              <p className={`text-xs mt-0.5 ${queryAllowanceTone}`}>{queryAllowanceText}</p>
            </div>
          </div>
        </div>

        {/* Usage Limit Reached State */}
        {isQueryLimitReached && usage?.limit !== null && (
          <div className="text-center py-6 px-4 mb-4 flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown size={24} className="text-white" />
            </div>
            <h4 className="text-white font-medium mb-2">Trip Limit Reached</h4>
            <p className="text-sm text-gray-300 mb-4 max-w-sm mx-auto">
              You've used all {usage.limit} Concierge queries for this trip.
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              {userPlan === 'free' && (
                <Button
                  onClick={() => (window.location.href = upgradeUrl)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 w-full"
                >
                  <Crown size={16} className="mr-2" />
                  Explorer - 10 Queries/Trip ($9.99/mo)
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

        {/* Empty State - Compact for Mobile */}
        {messages.length === 0 && !isQueryLimitReached && (
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
        </div>

        {/* Input */}
        <div className="chat-composer sticky bottom-0 z-10 bg-black/30 px-3 py-2 pb-[env(safe-area-inset-bottom)] flex-shrink-0">
          <AiChatInput
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            isTyping={isTyping}
            disabled={isQueryLimitReached}
            voiceState={voiceState}
            isVoiceEligible={isVoiceEligible}
            onVoiceToggle={toggleVoice}
            onVoiceUpgrade={() => (window.location.href = upgradeUrl)}
            showImageAttach={true}
            attachedImages={attachedImages}
            onImageAttach={files => setAttachedImages(prev => [...prev, ...files].slice(0, 4))}
            onRemoveImage={idx => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
          />
        </div>
      </div>
    </div>
  );
};
