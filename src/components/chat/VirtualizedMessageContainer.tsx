import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { hapticService } from '@/services/hapticService';

interface VirtualizedMessageContainerProps {
  messages: any[];
  renderMessage: (message: any, index: number) => React.ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  initialVisibleCount?: number;
  loadMoreThreshold?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const VirtualizedMessageContainer: React.FC<VirtualizedMessageContainerProps> = ({
  messages,
  renderMessage,
  onLoadMore,
  hasMore,
  isLoading,
  initialVisibleCount = 10,
  loadMoreThreshold = 3,
  className = '',
  style
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userIsScrolledUp, setUserIsScrolledUp] = useState(false);
  const [showNewMessagesBadge, setShowNewMessagesBadge] = useState(false);
  const previousMessageCountRef = useRef(messages.length);
  const isLoadingRef = useRef(false);
  const previousScrollHeightRef = useRef(0);
  
  // Internal windowing state - show last N messages initially
  const [visibleStartIndex, setVisibleStartIndex] = useState(
    Math.max(0, messages.length - initialVisibleCount)
  );
  const pageSize = 20;
  
  // Calculate visible messages
  const visibleMessages = messages.slice(visibleStartIndex);
  const localHasMore = visibleStartIndex > 0;

  // Update visible start index when messages change
  useEffect(() => {
    const newMessageCount = messages.length;
    const oldMessageCount = previousMessageCountRef.current;
    
    if (newMessageCount > oldMessageCount) {
      // New messages arrived
      if (!userIsScrolledUp) {
        // User at bottom - keep showing last N messages
        setVisibleStartIndex(Math.max(0, newMessageCount - initialVisibleCount));
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
        setShowNewMessagesBadge(false);
      } else {
        // User scrolled up - maintain current view, show badge
        setShowNewMessagesBadge(true);
      }
    } else if (newMessageCount < oldMessageCount) {
      // Messages removed (shouldn't happen often)
      setVisibleStartIndex(Math.max(0, newMessageCount - initialVisibleCount));
    }
    
    previousMessageCountRef.current = newMessageCount;
  }, [messages.length, userIsScrolledUp, initialVisibleCount]);

  // Initial scroll to bottom on mount
  useEffect(() => {
    if (containerRef.current && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // User is scrolled up if they're more than 100px from bottom
    const isScrolledUp = distanceFromBottom > 100;
    setUserIsScrolledUp(isScrolledUp);

    if (!isScrolledUp) {
      setShowNewMessagesBadge(false);
    }

    // Load more logic: check local windowing first, then server
    if (scrollTop < 200 && !isLoadingRef.current) {
      if (localHasMore) {
        // Load more from local messages
        isLoadingRef.current = true;
        const prevScrollHeight = containerRef.current.scrollHeight;
        previousScrollHeightRef.current = prevScrollHeight;
        
        setVisibleStartIndex(prev => {
          const newStart = Math.max(0, prev - pageSize);
          return newStart;
        });
        
        // Preserve scroll position after DOM update
        setTimeout(() => {
          if (containerRef.current) {
            const newScrollHeight = containerRef.current.scrollHeight;
            const scrollDiff = newScrollHeight - prevScrollHeight;
            containerRef.current.scrollTop = scrollTop + scrollDiff;
          }
          isLoadingRef.current = false;
        }, 50);
        
        hapticService.light();
      } else if (hasMore) {
        // Load more from server
        isLoadingRef.current = true;
        hapticService.light();
        onLoadMore();
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 1000);
      }
    }
  }, [hasMore, onLoadMore, localHasMore, pageSize]);

  // Scroll to bottom handler
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessagesBadge(false);
    setUserIsScrolledUp(false);
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Messages Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto chat-scroll-container native-scroll ${className}`}
        style={{
          minHeight: 'min(max(360px, 55vh), 720px)',
          ...style
        }}
      >
        {/* Load More Indicator at Top */}
        <LoadMoreIndicator
          isLoading={isLoading}
          hasMore={hasMore}
          localHasMore={localHasMore}
          messageCount={messages.length}
        />

        {/* Messages */}
        <div className="space-y-4 p-4">
          {visibleMessages.map((message, index) => (
            <React.Fragment key={message.id}>
              {renderMessage(message, index)}
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* New Messages Badge */}
      {showNewMessagesBadge && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottom}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg hover:bg-primary/90 transition-all animate-bounce text-sm font-medium"
          >
            ↓ New messages
          </button>
        </div>
      )}
    </div>
  );
};
