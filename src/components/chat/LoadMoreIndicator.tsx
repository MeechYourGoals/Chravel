import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadMoreIndicatorProps {
  isLoading: boolean;
  hasMore: boolean;
  localHasMore?: boolean;
  messageCount: number;
}

export const LoadMoreIndicator: React.FC<LoadMoreIndicatorProps> = ({
  isLoading,
  hasMore,
  localHasMore = false,
  messageCount
}) => {
  const hasMoreToLoad = hasMore || localHasMore;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="animate-spin h-5 w-5 text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Loading messages...</span>
      </div>
    );
  }

  if (hasMoreToLoad && messageCount > 0) {
    return (
      <div className="text-center py-3 px-4">
        <div className="text-xs text-muted-foreground">
          ↑ Scroll up to load older messages
        </div>
      </div>
    );
  }

  if (!hasMoreToLoad && messageCount > 0) {
    return (
      <div className="text-center py-3 px-4">
        <div className="inline-block px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-xs">
          Beginning of conversation
        </div>
      </div>
    );
  }

  return null;
};
