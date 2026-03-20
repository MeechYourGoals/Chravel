/**
 * GoogleCalendarSync Component
 *
 * Displays Google Calendar connection status and provides connect/disconnect actions.
 * Actual Google OAuth flow requires server-side setup (see STEP 3 report).
 * This component provides the UI scaffolding and status display.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export type GoogleCalendarSyncStatus = 'disconnected' | 'connected' | 'syncing' | 'error';

interface GoogleCalendarSyncProps {
  tripId: string;
  status?: GoogleCalendarSyncStatus;
  lastSyncedAt?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSync?: () => Promise<void>;
  calendarName?: string;
}

export const GoogleCalendarSync = ({
  tripId: _tripId,
  status = 'disconnected',
  lastSyncedAt,
  onConnect,
  onDisconnect,
  onSync,
  calendarName,
}: GoogleCalendarSyncProps) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSync) {
      toast.info('Google Calendar sync requires server-side configuration', {
        description:
          'Contact your admin to set up Google Calendar API credentials in the Supabase edge function.',
      });
      return;
    }
    setIsSyncing(true);
    try {
      await onSync();
      toast.success('Calendar synced');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync failed';
      toast.error('Sync failed', { description: msg });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnect = () => {
    if (onConnect) {
      onConnect();
    } else {
      toast.info('Google Calendar integration', {
        description:
          'Google Calendar bi-directional sync requires Google API credentials. See project setup docs.',
      });
    }
  };

  const StatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'syncing':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      default:
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const statusLabel = {
    disconnected: 'Not connected',
    connected: 'Connected',
    syncing: 'Syncing...',
    error: 'Sync error',
  };

  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Google Calendar icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285f4" strokeWidth="2" />
                <line x1="3" y1="10" x2="21" y2="10" stroke="#4285f4" strokeWidth="2" />
                <line
                  x1="8"
                  y1="4"
                  x2="8"
                  y2="2"
                  stroke="#4285f4"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="16"
                  y1="4"
                  x2="16"
                  y2="2"
                  stroke="#4285f4"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-foreground">Google Calendar</h4>
                <StatusIcon />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {status === 'connected' && calendarName ? calendarName : statusLabel[status]}
                {lastSyncedAt && status === 'connected' && (
                  <span className="ml-1">
                    &middot; Last sync: {new Date(lastSyncedAt).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {status === 'connected' || status === 'error' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="gap-1.5"
                >
                  {isSyncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Sync
                </Button>
                {onDisconnect && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDisconnect}
                    className="text-destructive hover:text-destructive"
                  >
                    Disconnect
                  </Button>
                )}
              </>
            ) : status === 'syncing' ? (
              <Button variant="outline" size="sm" disabled className="gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Syncing
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleConnect} className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Connect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
