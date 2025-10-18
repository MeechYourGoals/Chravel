
import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, Search, AlertCircle } from 'lucide-react';
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<'checking' | 'connected' | 'limited' | 'error' | 'thinking'>('connected');
  const [remainingQueries, setRemainingQueries] = useState<number>(Infinity);

  // Initialize remaining queries for events
  useEffect(() => {
    if (isEvent && user) {
      const remaining = conciergeRateLimitService.getRemainingQueries(user.id, tripId, isPlus);
      setRemainingQueries(remaining);
    }
  }, [isEvent, user, tripId, isPlus]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    // 🆕 Rate limit check for events
    if (isEvent && user) {
      const canQuery = conciergeRateLimitService.canQuery(user.id, tripId, isPlus);
      if (!canQuery) {
        const remaining = conciergeRateLimitService.getRemainingQueries(user.id, tripId, isPlus);
        const resetTime = conciergeRateLimitService.getTimeUntilReset(user.id, tripId, isPlus);
        
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

      // Send to Lovable AI Concierge
      const { data, error } = await supabase.functions.invoke('lovable-concierge', {
        body: {
          message: currentInput,
          tripContext,
          basecampLocation,
          preferences,
          chatHistory,
          isDemoMode
        }
      });

      if (error) throw error;

      setAiStatus('connected');

      // 🆕 Increment usage for events
      if (isEvent && user) {
        try {
          const usage = conciergeRateLimitService.incrementUsage(user.id, tripId, isPlus);
          setRemainingQueries(conciergeRateLimitService.getRemainingQueries(user.id, tripId, isPlus));
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
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
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

      {/* Empty State */}
      {messages.length === 0 && (
        <div className="text-center py-8 mb-6">
          <h4 className="text-white font-medium mb-3">Your AI Travel Concierge</h4>
          <div className="text-sm text-gray-300 space-y-2 max-w-md mx-auto">
            <p>Ask me anything about your trip:</p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>• "What are the best restaurants for our group?"</p>
              <p>• "Suggest activities based on our preferences"</p>
              <p>• "Help me plan our itinerary"</p>
              <p>• "What hidden gems should we check out?"</p>
            </div>
            <div className="mt-3 text-xs text-green-400 bg-green-500/10 rounded px-3 py-2 inline-block">
              ✨ Powered by AI - ask me anything!
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="space-y-4 mb-6 max-h-80 overflow-y-auto">
        <ChatMessages 
          messages={messages} 
          isTyping={isTyping}
          showMapWidgets={true} // 🆕 Enable map widget rendering
        />
      </div>

      {/* Input */}
      <AiChatInput
        inputMessage={inputMessage}
        onInputChange={setInputMessage}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
        isTyping={isTyping}
        disabled={aiStatus === 'error'}
      />
    </div>
  );
};
