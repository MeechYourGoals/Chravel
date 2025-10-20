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
}

export const VirtualizedMessageContainer: React.FC<VirtualizedMessageContainerProps> = ({
  messages,
  renderMessage,
  onLoadMore,
  hasMore,
  isLoading,
  initialVisibleCount = 10,
  loadMoreThreshold = 3,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userIsScrolledUp, setUserIsScrolledUp] = useState(false);
  const [showNewMessagesBadge, setShowNewMessagesBadge] = useState(false);
  const previousMessageCountRef = useRef(messages.length);
  const isLoadingRef = useRef(false);

  // Auto-scroll to bottom on new messages (unless user is scrolled up)
  useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      if (!userIsScrolledUp) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowNewMessagesBadge(false);
      } else {
        setShowNewMessagesBadge(true);
      }
    }
    previousMessageCountRef.current = messages.length;
  }, [messages.length, userIsScrolledUp]);

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

    if (isScrolledUp) {
      setShowNewMessagesBadge(false);
    }

    // Trigger load more when near the top
    if (scrollTop < 200 && hasMore && !isLoadingRef.current) {
      isLoadingRef.current = true;
      hapticService.light();
      onLoadMore();
      // Reset after 1 second to allow next load
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 1000);
    }
  }, [hasMore, onLoadMore]);

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
      >
        {/* Load More Indicator at Top */}
        <LoadMoreIndicator
          isLoading={isLoading}
          hasMore={hasMore}
          messageCount={messages.length}
        />

        {/* Messages */}
        <div className="space-y-4 p-4">
          {messages.map((message, index) => (
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
