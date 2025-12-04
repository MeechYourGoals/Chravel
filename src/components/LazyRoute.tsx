import React, { Suspense, useEffect, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface LazyRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
);

// Enhanced error fallback for chunk loading failures
const ChunkErrorFallback = ({ onRetry }: { onRetry: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-md w-full text-center space-y-6">
      <div className="flex justify-center">
        <AlertTriangle className="h-16 w-16 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Failed to Load Page</h1>
        <p className="text-muted-foreground">
          The page failed to load. This may be due to a network issue or outdated cache.
        </p>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-xl transition-colors font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
        
        <button
          onClick={() => {
            // Clear cache and reload
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
              });
            }
            window.location.reload();
          }}
          className="w-full bg-muted text-muted-foreground hover:bg-muted/80 px-6 py-3 rounded-xl transition-colors"
        >
          Clear Cache & Refresh
        </button>
      </div>
    </div>
  </div>
);

export const LazyRoute: React.FC<LazyRouteProps> = ({ 
  children, 
  fallback = <DefaultLoader /> 
}) => {
  const [retryKey, setRetryKey] = useState(0);
  const [hasChunkError, setHasChunkError] = useState(false);

  // Monitor for chunk loading errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.message || String(event.error);
      if (error.includes('Failed to fetch dynamically imported') || 
          error.includes('Loading chunk')) {
        setHasChunkError(true);
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason?.message || String(event.reason);
      if (error.includes('Failed to fetch dynamically imported') || 
          error.includes('Loading chunk')) {
        setHasChunkError(true);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const handleRetry = () => {
    setHasChunkError(false);
    setRetryKey(prev => prev + 1);
  };

  // Custom error boundary fallback for chunk errors
  const errorFallback = hasChunkError ? (
    <ChunkErrorFallback onRetry={handleRetry} />
  ) : undefined;

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense 
        key={retryKey}
        fallback={fallback}
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};