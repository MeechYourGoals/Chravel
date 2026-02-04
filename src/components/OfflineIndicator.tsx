import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

export const OfflineIndicator = () => {
  const { isOffline } = useOfflineStatus();
  if (!isOffline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
      <div
        className="backdrop-blur-sm text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 border bg-red-600/90 border-red-600"
      >
        <WifiOff className="h-4 w-4" />
        <span className="text-xs font-semibold">Offline</span>
      </div>
    </div>
  );
};
