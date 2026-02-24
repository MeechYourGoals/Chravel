import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MessageCircle, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  searchChatContentWithFilters,
  MessageSearchResult,
  BroadcastSearchResult,
} from '@/services/chatSearchService';
import { parseMessageSearchQuery } from '@/lib/parseMessageSearchQuery';
import { format } from 'date-fns';

interface MockMessage {
  id: string;
  text: string;
  sender: { id: string; name: string; avatar?: string };
  createdAt: string;
  isBroadcast?: boolean;
  tags?: string[];
}

interface ChatSearchOverlayProps {
  tripId: string;
  onClose: () => void;
  onResultSelect: (id: string, type: 'message' | 'broadcast') => void;
  isDemoMode?: boolean;
  demoMessages?: MockMessage[];
}

export const ChatSearchOverlay = ({
  tripId,
  onClose,
  onResultSelect,
  isDemoMode = false,
  demoMessages = [],
}: ChatSearchOverlayProps) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [messages, setMessages] = useState<MessageSearchResult[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const totalResults = messages.length + broadcasts.length;

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setMessages([]);
      setBroadcasts([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        if (isDemoMode && demoMessages.length > 0) {
          // Local search through demo messages
          const lowerQuery = query.toLowerCase();

          // Filter regular messages
          const matchedMessages = demoMessages
            .filter(msg => !msg.isBroadcast && msg.text.toLowerCase().includes(lowerQuery))
            .map(msg => ({
              id: msg.id,
              content: msg.text,
              author_name: msg.sender.name,
              user_id: msg.sender.id,
              created_at: msg.createdAt,
              type: 'message' as const,
            }));

          // Filter broadcasts
          const matchedBroadcasts = demoMessages
            .filter(msg => msg.isBroadcast && msg.text.toLowerCase().includes(lowerQuery))
            .map(msg => ({
              id: msg.id,
              message: msg.text,
              created_by: msg.sender.id,
              created_by_name: msg.sender.name,
              priority: msg.tags?.includes('urgent')
                ? 'urgent'
                : msg.tags?.includes('logistics')
                  ? 'high'
                  : 'normal',
              created_at: msg.createdAt,
              type: 'broadcast' as const,
            }));

          setMessages(matchedMessages);
          setBroadcasts(matchedBroadcasts);
        } else {
          // Query Supabase for authenticated mode (supports filters: from:, broadcast, day:, etc.)
          const parsed = parseMessageSearchQuery(query);
          const results = await searchChatContentWithFilters(tripId, parsed);
          setMessages(results.messages);
          setBroadcasts(results.broadcasts);
        }
        setSelectedIndex(0);
      } catch (err) {
        console.error('Chat search failed:', err);
        setMessages([]);
        setBroadcasts([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, tripId, isDemoMode, demoMessages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && totalResults > 0) {
        e.preventDefault();
        handleResultClick(selectedIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, totalResults]);

  // Auto-scroll to selected result
  useEffect(() => {
    if (resultsRef.current && totalResults > 0) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex, totalResults]);

  const handleResultClick = (index: number) => {
    if (index < messages.length) {
      const message = messages[index];
      onResultSelect(message.id, 'message');
    } else {
      const broadcast = broadcasts[index - messages.length];
      onResultSelect(broadcast.id, 'broadcast');
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority || priority === 'normal') return null;

    const config =
      {
        urgent: { bg: 'bg-red-500', text: 'Urgent' },
        high: { bg: 'bg-orange-500', text: 'High' },
        reminder: { bg: 'bg-blue-500', text: 'Reminder' },
      }[priority] || null;

    if (!config) return null;

    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium text-white', config.bg)}>
        {config.text}
      </span>
    );
  };

  const getSnippet = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-neutral-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-scale-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <Search className="w-5 h-5 text-white/50" />
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search messages and broadcasts..."
              className="w-full bg-transparent text-white placeholder:text-white/50 outline-none text-base pr-7"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto scrollbar-hide">
          {isSearching && <div className="p-8 text-center text-white/50">Searching...</div>}

          {!isSearching && totalResults === 0 && query && (
            <div className="p-8 text-center text-white/50">No results found for "{query}"</div>
          )}

          {!isSearching && totalResults === 0 && !query && (
            <div className="p-8 text-center text-white/50 space-y-2">
              <p>Type to search messages and broadcasts</p>
              <p className="text-xs text-white/40">Filters: from:Name · broadcast</p>
            </div>
          )}

          {/* Messages Section */}
          {messages.length > 0 && (
            <div className="border-b border-white/10">
              <div className="px-4 py-2 bg-white/5 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white/70">Messages</span>
                <span className="text-xs text-white/50">({messages.length})</span>
              </div>
              {messages.map((message, index) => (
                <button
                  key={message.id}
                  data-index={index}
                  onClick={() => handleResultClick(index)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5',
                    selectedIndex === index && 'bg-blue-500/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{message.author_name}</span>
                    <span className="text-xs text-white/50">
                      {format(new Date(message.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 line-clamp-2">
                    {getSnippet(message.content, 120)}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Broadcasts Section */}
          {broadcasts.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-white/5 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-white/70">Broadcasts</span>
                <span className="text-xs text-white/50">({broadcasts.length})</span>
              </div>
              {broadcasts.map((broadcast, index) => {
                const globalIndex = messages.length + index;
                return (
                  <button
                    key={broadcast.id}
                    data-index={globalIndex}
                    onClick={() => handleResultClick(globalIndex)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5',
                      selectedIndex === globalIndex && 'bg-orange-500/20',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {broadcast.created_by_name}
                        </span>
                        {getPriorityBadge(broadcast.priority)}
                      </div>
                      <span className="text-xs text-white/50">
                        {format(new Date(broadcast.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-white/70 line-clamp-2">
                      {getSnippet(broadcast.message, 120)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {totalResults > 0 && (
          <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex items-center justify-center gap-4 text-xs text-white/50">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        )}
      </div>
    </div>
  );
};
