
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
import { Button } from './ui/button';
import { Badge } from './ui/badge';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<'checking' | 'connected' | 'limited' | 'error' | 'thinking'>('connected');
  const [remainingQueries, setRemainingQueries] = useState<number>(Infinity);

  // PHASE 1 BUG FIX #7: Add mounted ref to prevent state updates after unmount
  const isMounted = useRef(true);

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
    };
  }, []);

  // Initialize remaining queries for events
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
    }
  }, [isEvent, user, tripId, isPlus]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    // 🆕 Rate limit check for events
    if (isEvent && user) {
      const canQuery = await conciergeRateLimitService.canQuery(user.id, tripId, getUserTier());
      if (!canQuery) {
        const remaining = await conciergeRateLimitService.getRemainingQueries(user.id, tripId, getUserTier());
        const resetTime = await conciergeRateLimitService.getTimeUntilReset(user.id, tripId, getUserTier());
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'assistant',
          content: `⚠️ You've reached your daily limit of 5 AI Concierge queries for this event. Your limit will reset in ${resetTime}.\n\n💎 Upgrade to Chravel+ for unlimited AI assistance!`,
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

      // Send to Lovable AI Concierge with retry logic
      let retryCount = 0;
      const MAX_RETRIES = 2;
      let data, error;
      
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
            console.log(`🔄 Retry attempt ${retryCount}/${MAX_RETRIES} for AI Concierge...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
            continue;
          }

          if (error) throw error;

          // Success - exit retry loop
          break;

        } catch (attemptError) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`🔄 Retry attempt ${retryCount}/${MAX_RETRIES} after error:`, attemptError);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
          throw attemptError; // Max retries exceeded
        }
      }

      setAiStatus('connected');

      // 🆕 Increment usage for events
      if (isEvent && user) {
        try {
          await conciergeRateLimitService.incrementUsage(user.id, tripId, getUserTier());
          const remaining = await conciergeRateLimitService.getRemainingQueries(user.id, tripId, getUserTier());
          // PHASE 1 BUG FIX #7: Only update state if component is still mounted
          if (isMounted.current) {
            setRemainingQueries(remaining);
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

    } catch (error) {
      console.error('❌ AI Concierge error:', error);
      setAiStatus('error');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I'm having trouble connecting to my AI services right now. Please try again in a moment.`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
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
            
            {/* Rate limit indicator for events */}
            {isEvent && !isPlus && user && remainingQueries !== Infinity && (
              <div className="flex items-center gap-1 ml-2">
                <AlertCircle size={16} className={remainingQueries <= 2 ? 'text-orange-400' : 'text-blue-400'} />
                <span className={`text-xs ${remainingQueries <= 2 ? 'text-orange-400' : 'text-blue-400'}`}>
                  {remainingQueries} {remainingQueries === 1 ? 'query' : 'queries'} left today
                </span>
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
        <div className="text-center py-3 px-4 mb-2 flex-shrink-0 max-h-[45vh] overflow-y-auto sm:py-6 sm:px-6">
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
        <div className="flex-1 overflow-y-auto p-4 chat-scroll-container native-scroll chat-safe-scroll">
          <ChatMessages 
            messages={messages} 
            isTyping={isTyping}
            showMapWidgets={true} // 🆕 Enable map widget rendering
          />
        </div>

        {/* Input */}
        <div className="sticky bottom-0 z-10 border-t border-white/10 bg-black/30 p-3 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-3 flex-shrink-0">
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
