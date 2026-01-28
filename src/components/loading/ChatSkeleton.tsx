/**
 * Chat loading skeleton for mobile/PWA
 * Uses animate-pulse for better perceived performance on slow connections
 * Matches chat layout to reduce layout shift
 */
export const ChatSkeleton = () => (
  <div className="flex flex-col h-full animate-pulse">
    {/* Chat header skeleton */}
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-muted rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-1/3 mb-2" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      </div>
    </div>
    
    {/* Messages area skeleton */}
    <div className="flex-1 p-4 space-y-4 overflow-hidden">
      {/* Incoming message */}
      <div className="flex gap-2">
        <div className="h-8 w-8 bg-muted rounded-full flex-shrink-0" />
        <div className="space-y-1">
          <div className="h-3 bg-muted rounded w-16" />
          <div className="h-12 bg-muted rounded-lg w-48 md:w-64" />
        </div>
      </div>
      
      {/* Outgoing message */}
      <div className="flex gap-2 justify-end">
        <div className="h-10 bg-muted rounded-lg w-40 md:w-56" />
      </div>
      
      {/* Incoming message */}
      <div className="flex gap-2">
        <div className="h-8 w-8 bg-muted rounded-full flex-shrink-0" />
        <div className="space-y-1">
          <div className="h-3 bg-muted rounded w-20" />
          <div className="h-16 bg-muted rounded-lg w-52 md:w-72" />
        </div>
      </div>
      
      {/* Outgoing message */}
      <div className="flex gap-2 justify-end">
        <div className="h-8 bg-muted rounded-lg w-32 md:w-48" />
      </div>
    </div>
    
    {/* Input area skeleton */}
    <div className="p-4 border-t border-border">
      <div className="flex gap-2">
        <div className="h-10 bg-muted rounded-lg flex-1" />
        <div className="h-10 w-10 bg-muted rounded-lg" />
      </div>
    </div>
  </div>
);
