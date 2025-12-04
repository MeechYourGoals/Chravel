import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface LazyRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
);

// Clear all caches including service workers
const clearAllCaches = async (): Promise<void> => {
  try {
    // Clear Cache Storage API
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[LazyRoute] Cleared all caches:', cacheNames);
    }

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log('[LazyRoute] Unregistered service workers:', registrations.length);
    }

    // Clear localStorage cache markers
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('chunk') || key?.includes('cache') || key?.includes('sw-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('[LazyRoute] Error clearing caches:', error);
  }
};

// Enhanced error fallback for chunk loading failures
const ChunkErrorFallback = ({ onRetry, onClearAndReload }: { 
  onRetry: () => void;
  onClearAndReload: () => void;
}) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-md w-full text-center space-y-6">
      <div className="flex justify-center">
        <AlertTriangle className="h-16 w-16 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Failed to Load Page</h1>
        <p className="text-muted-foreground">
          This usually happens after an app update. Clear your cache to load the latest version.
        </p>
      </div>
      
      <div className="space-y-3">
        {/* Primary action - Clear cache and reload */}
        <button
          onClick={onClearAndReload}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-xl transition-colors font-medium"
        >
          <Trash2 className="h-4 w-4" />
          Clear Cache & Reload
        </button>
        
        {/* Secondary action - Simple retry */}
        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-2 bg-muted text-muted-foreground hover:bg-muted/80 px-6 py-3 rounded-xl transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
      
      <p className="text-xs text-muted-foreground/60">
        If the problem persists, try closing all browser tabs and reopening the app.
      </p>
    </div>
  </div>
);

export const LazyRoute: React.FC<LazyRouteProps> = ({ 
  children, 
  fallback = <DefaultLoader /> 
}) => {
  const [retryKey, setRetryKey] = useState(0);
  const [hasChunkError, setHasChunkError] = useState(false);

  // Check if error is a chunk loading error
  const isChunkError = useCallback((error: string | Error): boolean => {
    const errorStr = typeof error === 'string' ? error : error.message || String(error);
    return (
      errorStr.includes('Failed to fetch dynamically imported') ||
      errorStr.includes('Loading chunk') ||
      errorStr.includes('ChunkLoadError') ||
      errorStr.includes('Loading CSS chunk') ||
      errorStr.includes('Importing a module script failed') ||
      errorStr.includes('error loading dynamically imported module')
    );
  }, []);

  // Monitor for chunk loading errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (isChunkError(event.message || String(event.error))) {
        console.warn('[LazyRoute] Chunk error detected:', event.message);
        setHasChunkError(true);
        event.preventDefault(); // Prevent default error handling
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason);
      if (isChunkError(errorMessage)) {
        console.warn('[LazyRoute] Chunk rejection detected:', errorMessage);
        setHasChunkError(true);
        event.preventDefault(); // Prevent default error handling
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [isChunkError]);

  // Simple retry without cache clearing
  const handleRetry = useCallback(() => {
    setHasChunkError(false);
    setRetryKey(prev => prev + 1);
  }, []);

  // Clear all caches and reload the page
  const handleClearAndReload = useCallback(async () => {
    await clearAllCaches();
    // Force a full page reload to get fresh chunks
    window.location.reload();
  }, []);

  // Render error fallback if chunk error detected
  if (hasChunkError) {
    return (
      <ChunkErrorFallback 
        onRetry={handleRetry} 
        onClearAndReload={handleClearAndReload}
      />
    );
  }

  return (
    <ErrorBoundary>
      <Suspense 
        key={retryKey}
        fallback={fallback}
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};
