import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarErrorStateProps {
  error?: Error | null;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const CalendarErrorState = ({
  error,
  onRetry,
  isRetrying = false,
}: CalendarErrorStateProps) => {
  const message = error?.message || 'Failed to load calendar events';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Couldn&apos;t load calendar</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-md">{message}</p>
      <Button
        onClick={onRetry}
        disabled={isRetrying}
        variant="outline"
        className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10"
      >
        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Retrying...' : 'Try again'}
      </Button>
    </div>
  );
};
