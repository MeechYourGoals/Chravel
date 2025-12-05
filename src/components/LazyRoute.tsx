import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

// Build version check - compare with stored version to detect updates
const BUILD_VERSION_KEY = 'chravel_build_version';
const LAST_CACHE_CLEAR_KEY = 'chravel_last_cache_clear';

interface LazyRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
);

// Get current build timestamp from meta tag (set during build)
const getBuildVersion = (): string => {
  const meta = document.querySelector('meta[name="build-version"]');
  return meta?.getAttribute('content') || 'unknown';
};

// Check if we're on a new version
const isNewVersion = (): boolean => {
  const currentVersion = getBuildVersion();
  const storedVersion = localStorage.getItem(BUILD_VERSION_KEY);

  if (currentVersion === 'unknown') return false;
  if (!storedVersion) {
    localStorage.setItem(BUILD_VERSION_KEY, currentVersion);
    return false;
  }

  return currentVersion !== storedVersion;
};

// Clear all caches including service workers - enhanced version
const clearAllCaches = async (): Promise<void> => {
  try {
    console.log('[LazyRoute] Starting comprehensive cache clear...');

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

    // Clear localStorage cache markers and old chunk references
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('chunk') || key?.includes('cache') || key?.includes('sw-') || key?.includes('vite')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Update the build version after clearing
    const currentVersion = getBuildVersion();
    if (currentVersion !== 'unknown') {
      localStorage.setItem(BUILD_VERSION_KEY, currentVersion);
    }

    // Mark when we last cleared cache
    localStorage.setItem(LAST_CACHE_CLEAR_KEY, Date.now().toString());

    console.log('[LazyRoute] Cache clear complete');
  } catch (error) {
    console.error('[LazyRoute] Error clearing caches:', error);
  }
};

// Enhanced error fallback for chunk loading failures
const ChunkErrorFallback = ({
  onRetry,
  onClearAndReload,
  retryCount = 0,
  isAutoRetrying = false
}: {
  onRetry: () => void;
  onClearAndReload: () => void;
  retryCount?: number;
  isAutoRetrying?: boolean;
}) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="max-w-md w-full text-center space-y-6">
      <div className="flex justify-center">
        {isAutoRetrying ? (
          <RefreshCw className="h-16 w-16 text-primary animate-spin" />
        ) : (
          <AlertTriangle className="h-16 w-16 text-destructive" />
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {isAutoRetrying ? 'Loading Update...' : 'Failed to Load Page'}
        </h1>
        <p className="text-muted-foreground">
          {isAutoRetrying
            ? 'A new version is available. Loading the latest version...'
            : 'This usually happens after an app update. Clear your cache to load the latest version.'
          }
        </p>
        {retryCount > 0 && !isAutoRetrying && (
          <p className="text-sm text-muted-foreground/80">
            Retry attempts: {retryCount}/3
          </p>
        )}
      </div>

      {!isAutoRetrying && (
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
      )}

      <p className="text-xs text-muted-foreground/60">
        {isAutoRetrying
          ? 'This should only take a moment...'
          : 'If the problem persists, try closing all browser tabs and reopening the app.'
        }
      </p>
    </div>
  </div>
);

// Maximum auto-retry attempts
const MAX_AUTO_RETRIES = 3;
// Exponential backoff delays in ms (1s, 2s, 4s)
const RETRY_DELAYS = [1000, 2000, 4000];

export const LazyRoute: React.FC<LazyRouteProps> = ({
  children,
  fallback = <DefaultLoader />
}) => {
  const [retryKey, setRetryKey] = useState(0);
  const [hasChunkError, setHasChunkError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);
  const autoRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if error is a chunk loading error
  const isChunkError = useCallback((error: string | Error): boolean => {
    const errorStr = typeof error === 'string' ? error : error.message || String(error);
    return (
      errorStr.includes('Failed to fetch dynamically imported') ||
      errorStr.includes('Loading chunk') ||
      errorStr.includes('ChunkLoadError') ||
      errorStr.includes('Loading CSS chunk') ||
      errorStr.includes('Importing a module script failed') ||
      errorStr.includes('error loading dynamically imported module') ||
      errorStr.includes('Failed to load module script') ||
      errorStr.includes('Unexpected token') // Sometimes happens with corrupted chunks
    );
  }, []);

  // Auto-retry with exponential backoff
  const attemptAutoRetry = useCallback(() => {
    if (retryCount >= MAX_AUTO_RETRIES) {
      console.warn('[LazyRoute] Max auto-retries reached, showing error UI');
      setIsAutoRetrying(false);
      return;
    }

    const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    console.log(`[LazyRoute] Auto-retry attempt ${retryCount + 1}/${MAX_AUTO_RETRIES} in ${delay}ms`);

    setIsAutoRetrying(true);

    autoRetryTimeoutRef.current = setTimeout(() => {
      setRetryCount(prev => prev + 1);
      setHasChunkError(false);
      setRetryKey(prev => prev + 1);
    }, delay);
  }, [retryCount]);

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

  // Auto-retry when chunk error detected (with version check)
  useEffect(() => {
    if (hasChunkError && retryCount < MAX_AUTO_RETRIES) {
      // Check if this is a new version - if so, auto-clear and reload
      if (isNewVersion()) {
        console.log('[LazyRoute] New version detected, auto-clearing cache');
        clearAllCaches().then(() => {
          window.location.reload();
        });
        return;
      }

      // Otherwise, attempt auto-retry
      attemptAutoRetry();
    }
  }, [hasChunkError, retryCount, attemptAutoRetry]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoRetryTimeoutRef.current) {
        clearTimeout(autoRetryTimeoutRef.current);
      }
    };
  }, []);

  // Simple retry without cache clearing
  const handleRetry = useCallback(() => {
    setHasChunkError(false);
    setRetryCount(prev => prev + 1);
    setRetryKey(prev => prev + 1);
  }, []);

  // Clear all caches and reload the page
  const handleClearAndReload = useCallback(async () => {
    await clearAllCaches();
    // Force a full page reload to get fresh chunks
    window.location.reload();
  }, []);

  // Render error fallback if chunk error detected and auto-retries exhausted
  if (hasChunkError && (retryCount >= MAX_AUTO_RETRIES || !isAutoRetrying)) {
    return (
      <ChunkErrorFallback
        onRetry={handleRetry}
        onClearAndReload={handleClearAndReload}
        retryCount={retryCount}
        isAutoRetrying={isAutoRetrying}
      />
    );
  }

  // Show loading state during auto-retry
  if (hasChunkError && isAutoRetrying) {
    return (
      <ChunkErrorFallback
        onRetry={handleRetry}
        onClearAndReload={handleClearAndReload}
        retryCount={retryCount}
        isAutoRetrying={true}
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
