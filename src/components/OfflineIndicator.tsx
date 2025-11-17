import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Button } from './ui/button';

export const OfflineIndicator = () => {
  const { isOffline, queueSize, processQueue } = useOfflineStatus();

  if (!isOffline && queueSize === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
      <div className="bg-destructive/90 backdrop-blur-sm text-destructive-foreground px-4 py-3 rounded-full shadow-lg flex items-center gap-3 border border-destructive">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">
          {isOffline ? 'You are offline' : 'Syncing...'}
          {queueSize > 0 && ` (${queueSize} pending)`}
        </span>
        {!isOffline && queueSize > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={processQueue}
            className="h-6 px-2 text-xs hover:bg-destructive-foreground/10"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync Now
          </Button>
        )}
      </div>
    </div>
  );
};
