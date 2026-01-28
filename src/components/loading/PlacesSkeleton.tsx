/**
 * Places/Map loading skeleton for mobile/PWA
 * Uses animate-pulse for better perceived performance on slow connections
 * Matches places panel layout to reduce layout shift
 */
export const PlacesSkeleton = () => (
  <div className="flex flex-col h-full animate-pulse">
    {/* Map area skeleton */}
    <div className="h-[50vh] md:h-[60vh] bg-muted relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-12 w-12 bg-muted-foreground/20 rounded-full" />
      </div>
    </div>
    
    {/* Search bar skeleton */}
    <div className="p-4">
      <div className="h-10 bg-muted rounded-lg" />
    </div>
    
    {/* Basecamp cards skeleton */}
    <div className="px-4 space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
      </div>
    </div>
    
    {/* Places list skeleton */}
    <div className="p-4 space-y-3 flex-1">
      <div className="h-5 bg-muted rounded w-1/3" />
      <div className="h-20 bg-muted rounded-lg" />
      <div className="h-20 bg-muted rounded-lg" />
      <div className="h-20 bg-muted rounded-lg" />
    </div>
  </div>
);
