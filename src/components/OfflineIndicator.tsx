import React from 'react';
import { CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import { useOfflineUiStatus } from '@/offline/network';

export const OfflineIndicator = () => {
  const { status, pendingCount, failedCount, recentlySynced, syncNow } = useOfflineUiStatus();

  const shouldShow =
    status === 'offline' || status === 'reconnecting' || failedCount > 0 || recentlySynced;
  if (!shouldShow) return null;

  const label =
    status === 'offline'
      ? 'Offline'
      : status === 'reconnecting'
        ? 'Reconnecting'
        : 'Synced';

  const sub =
    status === 'offline'
      ? 'Changes will sync when you’re back online.'
      : failedCount > 0
        ? `${failedCount} failed`
        : pendingCount > 0
          ? `${pendingCount} pending`
          : undefined;

  const tone =
    status === 'offline'
      ? 'bg-red-600/90 border-red-600'
      : status === 'reconnecting'
        ? 'bg-amber-600/90 border-amber-600'
        : 'bg-emerald-600/90 border-emerald-600';

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
      <div
        className={`backdrop-blur-sm text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 border ${tone}`}
      >
        {status === 'offline' ? (
          <WifiOff className="h-4 w-4" />
        ) : status === 'reconnecting' ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}

        <span className="text-sm font-semibold">{label}</span>
        {sub && <span className="text-xs text-white/90">{sub}</span>}

        {status !== 'offline' && (pendingCount > 0 || failedCount > 0) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={syncNow}
            className="h-7 px-2 text-xs hover:bg-white/10 text-white"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync
          </Button>
        )}
      </div>
    </div>
  );
};
