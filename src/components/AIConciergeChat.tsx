
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, CheckCircle, Search, AlertCircle, Crown, Clock } from 'lucide-react';
import { useConsumerSubscription } from '../hooks/useConsumerSubscription';
import { TripPreferences } from '../types/consumer';
import { TripContextService } from '../services/tripContextService';
import { EnhancedTripContextService } from '../services/enhancedTripContextService';
import { useBasecamp } from '../contexts/BasecampContext';
import { ChatMessages } from './chat/ChatMessages';
import { AiChatInput } from './chat/AiChatInput';
import { supabase } from '@/integrations/supabase/client';
import { conciergeRateLimitService } from '../services/conciergeRateLimitService';
import { useAuth } from '../hooks/useAuth';
import { useConciergeUsage } from '../hooks/useConciergeUsage';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
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

export const AIConciergeChat = ({ tripId, basecamp, preferences, isDemoMode = false, isEvent = false }: AIConciergeChatProps) => {
  const { isPlus } = useConsumerSubscription();
  const { basecamp: globalBasecamp } = useBasecamp();
  const { user } = useAuth();
  const { usage, getUsageStatus, formatTimeUntilReset, isFreeUser, upgradeUrl } = useConciergeUsage();
  const { isOffline } = useOfflineStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<'checking' | 'connected' | 'limited' | 'error' | 'thinking' | 'offline' | 'degraded'>('connected');
  const [remainingQueries, setRemainingQueries] = useState<number>(Infinity);
  const [resetCountdown, setResetCountdown] = useState<string>('');
  const [isUsingCachedResponse, setIsUsingCachedResponse] = useState(false);

  // PHASE 1 BUG FIX #7: Add mounted ref to prevent state updates after unmount
  const isMounted = useRef(true);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to convert isPlus boolean to tier string
  const getUserTier = (): 'free' | 'plus' | 'pro' => {
    if (user?.isPro) return 'pro';
    if (isPlus) return 'plus';
    return 'free';
  };

  // PHASE 1 BUG FIX #7: Set up cleanup to track component mount state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Initialize remaining queries for events and load cached messages
  useEffect(() => {
    if (isEvent && user) {
      conciergeRateLimitService.getRemainingQueries(user.id, tripId, getUserTier())
        .then(remaining => {
          // PHASE 1 BUG FIX #7: Only update state if component is still mounted
          if (isMounted.current) {
            setRemainingQueries(remaining);
          }
        })
        .catch(err => console.error('Failed to get remaining queries:', err));
      
      // Load reset countdown timer
      conciergeRateLimitService.getTimeUntilReset(user.id, tripId, getUserTier())
        .then(timeUntilReset => {
          if (isMounted.current) {
            setResetCountdown(timeUntilReset);
          }
        })
        .catch(err => console.error('Failed to get reset time:', err));
    }
    
    // Load cached messages for offline mode
    const cachedMessages = conciergeCacheService.getCachedMessages(tripId);
    if (cachedMessages && cachedMessages.length > 0 && isMounted.current) {
      setMessages(cachedMessages);
    }
  }, [isEvent, user, tripId, isPlus]);

  // Update countdown timer every minute
  useEffect(() => {
    if (isEvent && user && remainingQueries !== Infinity) {
      const updateCountdown = async () => {
        try {
          const timeUntilReset = await conciergeRateLimitService.getTimeUntilReset(user.id, tripId, getUserTier());
          if (isMounted.current) {
            setResetCountdown(timeUntilReset);
          }
        } catch (err) {
          console.error('Failed to update countdown:', err);
        }
      };
      
      updateCountdown();
      countdownIntervalRef.current = setInterval(updateCountdown, 60000); // Update every minute
      
      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [isEvent, user, tripId, remainingQueries]);

  // Monitor offline status
  useEffect(() => {
    if (isOffline) {
      setAiStatus('offline');
    } else if (aiStatus === 'offline') {
      setAiStatus('connected');
    }
  }, [isOffline]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    // Check offline mode first
    if (isOffline) {
      // Try to get cached response for similar query
      const cachedResponse = conciergeCacheService.getCachedResponse(tripId, inputMessage);
      if (cachedResponse) {
        setIsUsingCachedResponse(true);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'user',
          content: inputMessage,
          timestamp: new Date().toISOString()
        }, {
          ...cachedResponse,
          id: (Date.now() + 1).toString(),
          timestamp: new Date().toISOString()
        }]);
        setInputMessage('');
        return;
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'user',
          content: inputMessage,
          timestamp: new Date().toISOString()
        }, {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: '📡 **Offline Mode**\n\nI\'m currently offline and don\'t have a cached response for this query. Please check your connection and try again when online.',
          timestamp: new Date().toISOString()
        }]);
        setInputMessage('');
        return;
      }
    }

    // 🆕 Rate limit check for events
    if (isEvent && user) {
      const canQuery = await conciergeRateLimitService.canQuery(user.id, tripId, getUserTier());
      if (!canQuery) {
        const remaining = await conciergeRateLimitService.getRemainingQueries(user.id, tripId, getUserTier());
        const resetTime = await conciergeRateLimitService.getTimeUntilReset(user.id, tripId, getUserTier());
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'assistant',
          content: `⚠️ **Daily Limit Reached**\n\nYou've used all ${getUserTier() === 'free' ? 5 : 50} AI Concierge queries for today. Your limit will reset in ${resetTime}.\n\n💎 Upgrade to Chravel+ for unlimited AI assistance!`,
          timestamp: new Date().toISOString()
        }]);
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsTyping(true);
    setAiStatus('thinking');

    try {
      // Get full trip context with enhanced contextual data
      let tripContext;
      try {
        tripContext = await EnhancedTripContextService.getEnhancedTripContext(tripId, false);
      } catch (error) {
        console.warn('Enhanced context failed, falling back to basic context:', error);
        try {
          tripContext = await TripContextService.getTripContext(tripId, false);
        } catch (fallbackError) {
          console.warn('Basic context also failed, using minimal context:', fallbackError);
          tripContext = {
            tripId,
            title: 'Current Trip',
            location: globalBasecamp?.address || basecamp?.address || 'Unknown location',
            dateRange: new Date().toISOString().split('T')[0],
            participants: [],
            itinerary: [],
            accommodation: globalBasecamp?.name || basecamp?.name,
            currentDate: new Date().toISOString().split('T')[0],
            upcomingEvents: [],
            recentUpdates: [],
            confirmationNumbers: {}
          };
        }
      }

      // Build chat history for context
      const chatHistory = messages.slice(-6).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Prepare basecamp location
      const basecampLocation = globalBasecamp ? {
        name: globalBasecamp.name || 'Basecamp',
        address: globalBasecamp.address
      } : (basecamp ? {
        name: basecamp.name || 'Basecamp',
        address: basecamp.address
      } : undefined);

      // Send to Lovable AI Concierge with retry logic and graceful degradation
      let retryCount = 0;
      const MAX_RETRIES = 2;
      let data, error;
      let lastError: any = null;
      
      while (retryCount <= MAX_RETRIES) {
        try {
          const response = await supabase.functions.invoke('lovable-concierge', {
            body: {
              message: currentInput,
              tripContext,
              basecampLocation,
              preferences,
              chatHistory,
              isDemoMode
            }
          });

          data = response.data;
          error = response.error;

          // Check if response indicates a retryable error
          if (error && retryCount < MAX_RETRIES) {
            retryCount++;
            lastError = error;
            console.log(`🔄 Retry attempt ${retryCount}/${MAX_RETRIES} for AI Concierge...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
            continue;
          }

          if (error) {
            lastError = error;
            throw error;
          }

          // Success - exit retry loop
          break;

        } catch (attemptError) {
          lastError = attemptError;
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`🔄 Retry attempt ${retryCount}/${MAX_RETRIES} after error:`, attemptError);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
          // Max retries exceeded - will use graceful degradation below
          break;
        }
      }

      // Graceful degradation: If AI service unavailable, provide helpful fallback
      if (!data || error || lastError) {
        console.warn('AI service unavailable, using graceful degradation');
        setAiStatus('degraded');
        
        // Try to provide context-aware fallback response
        const fallbackResponse = generateFallbackResponse(currentInput, tripContext, basecampLocation);
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: fallbackResponse,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        conciergeCacheService.cacheMessage(tripId, currentInput, assistantMessage);
        setIsTyping(false);
        return;
      }

      setAiStatus('connected');
      setIsUsingCachedResponse(false);

      // 🆕 Increment usage for events
      if (isEvent && user) {
        try {
          await conciergeRateLimitService.incrementUsage(user.id, tripId, getUserTier());
          const remaining = await conciergeRateLimitService.getRemainingQueries(user.id, tripId, getUserTier());
          const resetTime = await conciergeRateLimitService.getTimeUntilReset(user.id, tripId, getUserTier());
          // PHASE 1 BUG FIX #7: Only update state if component is still mounted
          if (isMounted.current) {
            setRemainingQueries(remaining);
            setResetCountdown(resetTime);
          }
        } catch (error) {
          console.error('Failed to increment usage:', error);
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date().toISOString(),
        usage: data.usage,
        sources: data.sources || data.citations,
        googleMapsWidget: data.googleMapsWidget // 🆕 Pass widget token
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Cache the response for offline mode
      conciergeCacheService.cacheMessage(tripId, currentInput, assistantMessage);

    } catch (error) {
      console.error('❌ AI Concierge error:', error);
      setAiStatus('error');
      
      // Try graceful degradation
      try {
        const fallbackResponse = generateFallbackResponse(currentInput, tripContext, basecampLocation);
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `⚠️ **AI Service Temporarily Unavailable**\n\n${fallbackResponse}\n\n*Note: This is a basic response. Full AI features will return once the service is restored.*`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        conciergeCacheService.cacheMessage(tripId, currentInput, errorMessage);
      } catch (fallbackError) {
        // Ultimate fallback
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `I'm having trouble connecting to my AI services right now. Please try again in a moment.`,
          timestamp: new Date().toISOString()
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
    basecampLocation?: { name: string; address: string }
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
    
    // Payment queries
    if (lowerQuery.match(/\b(payment|money|owe|spent|cost|budget|expense)\b/)) {
      return `💰 Check the Payments tab to see expense details and who owes what.`;
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
    <div className="flex flex-col p-4 overflow-hidden flex-1 min-h-0">
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
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-xs text-green-400">Ready with Web Search</span>
            </div>
            
            {/* Usage status for free users */}
            {isFreeUser && usage && (
              <div className="flex items-center gap-2 ml-2">
                <Badge 
                  variant={getUsageStatus().status === 'limit_reached' ? 'destructive' : 
                          getUsageStatus().status === 'warning' ? 'secondary' : 'default'}
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
            
            {/* Rate limit indicator for events with countdown */}
            {isEvent && !isPlus && user && remainingQueries !== Infinity && (
              <div className="flex items-center gap-1 ml-2">
                <AlertCircle size={16} className={remainingQueries <= 2 ? 'text-orange-400' : 'text-blue-400'} />
                <span className={`text-xs ${remainingQueries <= 2 ? 'text-orange-400' : 'text-blue-400'}`}>
                  {remainingQueries} {remainingQueries === 1 ? 'query' : 'queries'} left
                </span>
                {resetCountdown && (
                  <span className="text-xs text-gray-400 ml-1">
                    (resets in {resetCountdown})
                  </span>
                )}
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
        <div className="text-center py-8 mb-6 flex-shrink-0">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown size={24} className="text-white" />
          </div>
          <h4 className="text-white font-medium mb-3">Daily Limit Reached</h4>
          <div className="text-sm text-gray-300 space-y-3 max-w-md mx-auto">
            <p>You've used all {usage.limit} free AI queries today.</p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Clock size={14} />
              <span>Resets in {formatTimeUntilReset(usage.resetTime)}</span>
            </div>
            <div className="mt-4">
              <Button
                onClick={() => window.open(upgradeUrl, '_blank')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <Crown size={16} className="mr-2" />
                Upgrade to Pro for Unlimited Access
              </Button>
            </div>
          </div>
        </div>
        )}

        {/* Empty State - Compact for Mobile */}
        {messages.length === 0 && !(isFreeUser && usage?.isLimitReached) && (
        <div className="text-center py-6 px-4 flex-shrink-0">
          <h4 className="text-base font-semibold mb-1.5 text-white sm:text-lg sm:mb-2">Your AI Travel Concierge</h4>
          <div className="text-sm text-gray-300 space-y-1 max-w-md mx-auto">
            <p className="text-xs sm:text-sm mb-1.5">Ask me anything about your trip:</p>
            <div className="text-xs text-gray-400 space-y-0.5 leading-snug">
              <p>• "Suggest activities based on our preferences"</p>
              <p>• "What hidden gems should we check out?"</p>
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
        <div className="flex-1 overflow-y-auto p-4 chat-scroll-container native-scroll">
          {messages.length > 0 && (
            <ChatMessages 
              messages={messages} 
              isTyping={isTyping}
              showMapWidgets={true} // 🆕 Enable map widget rendering
            />
          )}
        </div>

        {/* Input */}
        <div className="sticky bottom-0 z-10 border-t border-white/10 bg-black/30 p-3 pb-[env(safe-area-inset-bottom)] md:pb-3 flex-shrink-0">
          <AiChatInput
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            isTyping={isTyping}
            disabled={aiStatus === 'error' || (isFreeUser && usage?.isLimitReached)}
          />
        </div>
      </div>
    </div>
  );
};
