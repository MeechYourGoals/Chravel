import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { isSameDay } from 'date-fns';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { DateSeparator } from './DateSeparator';
import { hapticService } from '@/services/hapticService';
import { ArrowDown } from 'lucide-react';

interface ChatMessageLike {
  id: string;
  created_at?: string;
  createdAt?: string;
  sender_id?: string;
  user_id?: string;
}

interface VirtualizedMessageContainerProps {
  messages: ChatMessageLike[];
  renderMessage: (
    message: ChatMessageLike,
    index: number,
    showSenderInfo: boolean,
  ) => React.ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  initialVisibleCount?: number;
  loadMoreThreshold?: number;
  className?: string;
  style?: React.CSSProperties;
  autoScroll?: boolean;
  restoreScroll?: boolean;
  scrollKey?: string;
}

type RowItem =
  | { type: 'date'; date: Date }
  | { type: 'message'; message: ChatMessageLike; index: number; showSenderInfo: boolean };

const ROW_HEIGHT_ESTIMATE = 72;
const DATE_ROW_HEIGHT = 40;

export const VirtualizedMessageContainer: React.FC<VirtualizedMessageContainerProps> = ({
  messages,
  renderMessage,
  onLoadMore,
  hasMore,
  isLoading,
  initialVisibleCount = 10,
  className = '',
  style,
  autoScroll = true,
  restoreScroll = true,
  scrollKey = 'chat-scroll',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userIsScrolledUp, setUserIsScrolledUp] = useState(false);
  const [showNewMessagesBadge, setShowNewMessagesBadge] = useState(false);
  const previousMessageCountRef = useRef(messages.length);
  const isLoadingRef = useRef(false);
  const pageSize = 20;
  const [visibleStartIndex, setVisibleStartIndex] = useState(
    Math.max(0, messages.length - initialVisibleCount),
  );
  const localHasMore = visibleStartIndex > 0;
  const visibleMessages = messages.slice(visibleStartIndex);

  const TWO_MINUTES_MS = 2 * 60 * 1000;

  const rows = useMemo((): RowItem[] => {
    const result: RowItem[] = [];
    visibleMessages.forEach((message, idx) => {
      const currentDate = new Date(message.created_at || message.createdAt || 0);
      const prevMessage = visibleMessages[idx - 1];
      const prevDate = prevMessage
        ? new Date(prevMessage.created_at || prevMessage.createdAt || 0)
        : null;
      const showDateSeparator = !prevDate || !isSameDay(currentDate, prevDate);
      if (showDateSeparator) {
        result.push({ type: 'date', date: currentDate });
      }
      // Collapse sender info if same sender within 2-minute window (message grouping)
      const senderId = message.sender_id || message.user_id;
      const prevSenderId = prevMessage ? prevMessage.sender_id || prevMessage.user_id : null;
      const withinWindow = prevDate
        ? currentDate.getTime() - prevDate.getTime() < TWO_MINUTES_MS
        : false;
      const showSenderInfo =
        showDateSeparator || !senderId || senderId !== prevSenderId || !withinWindow;
      result.push({ type: 'message', message, index: visibleStartIndex + idx, showSenderInfo });
    });
    return result;
  }, [visibleMessages, visibleStartIndex]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: index => (rows[index]?.type === 'date' ? DATE_ROW_HEIGHT : ROW_HEIGHT_ESTIMATE),
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessagesBadge(false);
    setUserIsScrolledUp(false);
  }, []);

  useEffect(() => {
    if (!autoScroll) return;
    const newMessageCount = messages.length;
    const oldMessageCount = previousMessageCountRef.current;
    if (newMessageCount > oldMessageCount && !userIsScrolledUp) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      });
    }
  }, [messages.length, autoScroll, userIsScrolledUp]);

  useEffect(() => {
    if (!restoreScroll || !containerRef.current) return;
    const savedScroll = localStorage.getItem(scrollKey);
    if (savedScroll) {
      containerRef.current.scrollTop = parseInt(savedScroll, 10);
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        });
      });
    }
  }, [scrollKey, restoreScroll]);

  useEffect(() => {
    if (!restoreScroll || !containerRef.current) return;
    const container = containerRef.current;
    const saveScrollPosition = () => {
      if (container) {
        localStorage.setItem(scrollKey, container.scrollTop.toString());
      }
    };
    let scrollTimer: ReturnType<typeof setTimeout>;
    const handleScrollSave = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(saveScrollPosition, 500);
    };
    container.addEventListener('scroll', handleScrollSave, { passive: true });
    return () => {
      clearTimeout(scrollTimer);
      saveScrollPosition();
      container.removeEventListener('scroll', handleScrollSave);
    };
  }, [scrollKey, restoreScroll]);

  useEffect(() => {
    const newMessageCount = messages.length;
    const oldMessageCount = previousMessageCountRef.current;
    if (newMessageCount > oldMessageCount) {
      if (!userIsScrolledUp) {
        setVisibleStartIndex(Math.max(0, newMessageCount - initialVisibleCount));
        setShowNewMessagesBadge(false);
      } else {
        setShowNewMessagesBadge(true);
      }
    } else if (newMessageCount < oldMessageCount) {
      setVisibleStartIndex(Math.max(0, newMessageCount - initialVisibleCount));
    }
    previousMessageCountRef.current = newMessageCount;
  }, [messages.length, userIsScrolledUp, initialVisibleCount]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isScrolledUp = distanceFromBottom > 100;
    setUserIsScrolledUp(isScrolledUp);

    // Logic: If user is scrolled up more than 100px, show FAB regardless of new messages.
    // If there are new messages, we definitely show it (handled by setShowNewMessagesBadge above)
    // BUT we want to support "always visible scroll-to-bottom" when scrolled up.

    // We'll use showNewMessagesBadge for the visual indicator, but maybe we should rename/refactor?
    // For now, let's keep the logic simple:
    // If scrolled up significantly OR if new messages arrived while scrolled up -> Show Badge.

    if (!isScrolledUp) {
      setShowNewMessagesBadge(false);
    } else {
      // Optional: You might want to always show it if scrolled up,
      // or only if there's a reason. The plan asked for "always visible scroll-to-bottom FAB".
      // So we set it to true if isScrolledUp is true.
      setShowNewMessagesBadge(true);
    }

    if (scrollTop < 200 && !isLoadingRef.current && !isLoading) {
      if (localHasMore) {
        isLoadingRef.current = true;
        const prevScrollHeight = containerRef.current.scrollHeight;
        setVisibleStartIndex(prev => Math.max(0, prev - pageSize));
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (containerRef.current) {
              const newScrollHeight = containerRef.current.scrollHeight;
              containerRef.current.scrollTop = scrollTop + (newScrollHeight - prevScrollHeight);
            }
            isLoadingRef.current = false;
          });
        });
        hapticService.light();
      } else if (hasMore) {
        hapticService.light();
        onLoadMore();
      }
    }
  }, [hasMore, onLoadMore, localHasMore, pageSize, isLoading]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto scroll-smooth ${className}`}
        style={{ WebkitOverflowScrolling: 'touch', ...style }}
      >
        <LoadMoreIndicator
          isLoading={isLoading}
          hasMore={hasMore}
          localHasMore={localHasMore}
          messageCount={messages.length}
        />

        <div
          className="p-3"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map(virtualRow => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            if (row.type === 'date') {
              return (
                <div
                  key={`date-${row.date.getTime()}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <DateSeparator date={row.date} />
                </div>
              );
            }
            return (
              <div
                key={row.message.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="space-y-2">
                  {renderMessage(row.message, row.index, row.showSenderInfo)}
                </div>
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} className="h-px" aria-hidden="true" />
      </div>

      {showNewMessagesBadge && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottom}
            className="bg-muted/50 text-muted-foreground px-4 py-1.5 rounded-full text-xs flex items-center justify-center gap-1.5 hover:bg-muted/70 transition-all active:scale-95"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            New messages
          </button>
        </div>
      )}
    </div>
  );
};
