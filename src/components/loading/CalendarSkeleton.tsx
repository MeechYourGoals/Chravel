/**
 * Calendar loading skeleton for mobile/PWA
 * Uses animate-pulse for better perceived performance on slow connections
 * Matches calendar grid layout to reduce layout shift
 */
export const CalendarSkeleton = () => (
  <div className="p-4 space-y-4 animate-pulse">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div className="h-8 bg-muted rounded-md w-1/3" />
      <div className="flex gap-2">
        <div className="h-8 w-8 bg-muted rounded" />
        <div className="h-8 w-8 bg-muted rounded" />
      </div>
    </div>
    
    {/* Day headers */}
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={`header-${i}`} className="h-6 bg-muted rounded text-center" />
      ))}
    </div>
    
    {/* Calendar grid (5 weeks) */}
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={`cell-${i}`} className="h-12 md:h-16 bg-muted rounded" />
      ))}
    </div>
    
    {/* Event list skeleton */}
    <div className="space-y-2 mt-4">
      <div className="h-4 bg-muted rounded w-1/4" />
      <div className="h-16 bg-muted rounded" />
      <div className="h-16 bg-muted rounded" />
    </div>
  </div>
);
