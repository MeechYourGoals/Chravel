import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, FileImage, MapPin, Mic, RefreshCcw, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  getPermissionStatus,
  openAppSettings,
  requestPermission,
  type PermissionId,
  type PermissionState,
  type PermissionStatus,
} from '@/native/permissions';

function formatState(state: PermissionState): string {
  switch (state) {
    case 'granted':
      return 'Granted';
    case 'denied':
      return 'Denied';
    case 'prompt':
      return 'Not requested yet';
    case 'unknown':
      return 'Unknown';
    case 'unavailable':
      return 'Unavailable';
    case 'not_applicable':
      return 'Not used';
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

function badgeClasses(state: PermissionState): string {
  switch (state) {
    case 'granted':
      return 'bg-green-500/15 text-green-300 border-green-500/30';
    case 'denied':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    case 'prompt':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    case 'unknown':
      return 'bg-gray-500/15 text-gray-300 border-gray-500/30';
    case 'unavailable':
      return 'bg-gray-700/30 text-gray-400 border-gray-600/40';
    case 'not_applicable':
      return 'bg-gray-700/30 text-gray-400 border-gray-600/40';
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

interface PermissionCardConfig {
  id: PermissionId;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const ConsumerPermissionsSection = () => {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<Record<PermissionId, PermissionStatus> | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<PermissionId | null>(null);

  const cards: PermissionCardConfig[] = useMemo(
    () => [
      {
        id: 'notifications',
        title: 'Notifications',
        description:
          'Used for trip updates, chat messages, broadcasts, and reminders—so you don’t miss important moments when the app is closed.',
        icon: <Bell size={18} className="text-glass-orange" />,
      },
      {
        id: 'photos_files',
        title: 'Photos & Files',
        description:
          'Used to upload photos, videos, and documents into trip chats and shared media.',
        icon: <FileImage size={18} className="text-blue-300" />,
      },
      {
        id: 'location',
        title: 'Location',
        description:
          'Used only when you turn on location sharing (e.g., coordinating meetups and tracking trip movement).',
        icon: <MapPin size={18} className="text-pink-300" />,
      },
      {
        id: 'microphone',
        title: 'Microphone',
        description: 'Not currently used by Chravel. If we add voice features later, this will be requested then.',
        icon: <Mic size={18} className="text-gray-300" />,
      },
    ],
    [],
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const entries = await Promise.all(
        cards.map(async c => {
          const status = await getPermissionStatus(c.id);
          return [c.id, status] as const;
        }),
      );

      const next: Record<PermissionId, PermissionStatus> = entries.reduce((acc, [id, status]) => {
        acc[id] = status;
        return acc;
      }, {} as Record<PermissionId, PermissionStatus>);

      setStatuses(next);
    } finally {
      setIsRefreshing(false);
    }
  }, [cards]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRequest = useCallback(
    async (id: PermissionId) => {
      setBusyId(id);
      try {
        const result = await requestPermission(id);
        await refresh();

        if (result === 'granted') {
          toast({
            title: 'Enabled',
            description: 'Permission granted.',
          });
          return;
        }

        if (result === 'denied') {
          toast({
            title: 'Permission denied',
            description: 'You can enable it in iOS Settings.',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Not enabled',
          description: 'If you changed your mind, try again or enable it in iOS Settings.',
        });
      } catch (error) {
        toast({
          title: 'Something went wrong',
          description: error instanceof Error ? error.message : 'Failed to request permission.',
          variant: 'destructive',
        });
      } finally {
        setBusyId(null);
      }
    },
    [refresh, toast],
  );

  const handleOpenSettings = useCallback(async () => {
    const opened = await openAppSettings();
    if (!opened) {
      toast({
        title: 'Unable to open Settings',
        description: 'This is only available inside the iOS app.',
      });
    }
  }, [toast]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon size={22} className="text-glass-orange" />
            Permissions Center
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            We only ask for permissions when you use a feature. You can review and update access here anytime.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="border-white/10 bg-white/5 hover:bg-white/10"
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {cards.map(card => {
          const status = statuses?.[card.id];
          const state = status?.state ?? 'unknown';
          const canOpenSettings = status?.canOpenSettings ?? false;
          const canRequest = status?.canRequest ?? false;
          const detail = status?.detail;

          const showEnable =
            (state === 'prompt' || state === 'unknown') &&
            canRequest &&
            card.id !== 'microphone' &&
            card.id !== 'photos_files';
          const showOpenSettings = state === 'denied' && canOpenSettings;

          return (
            <div key={card.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">{card.icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-white font-semibold">{card.title}</div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${badgeClasses(
                          state,
                        )}`}
                      >
                        {formatState(state)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{card.description}</p>
                    {detail && <p className="text-xs text-gray-500 mt-2">{detail}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {showEnable && (
                    <Button
                      type="button"
                      onClick={() => void handleRequest(card.id)}
                      disabled={busyId === card.id}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {busyId === card.id ? 'Working…' : 'Enable'}
                    </Button>
                  )}

                  {card.id === 'photos_files' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleRequest('photos_files')}
                      disabled={busyId === 'photos_files'}
                      className="border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      {busyId === 'photos_files' ? 'Opening…' : 'Choose a file'}
                    </Button>
                  )}

                  {showOpenSettings && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleOpenSettings()}
                      className="border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      Open Settings
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

