import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Camera, MapPin, Mic, RefreshCcw, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
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
          'Used for trip updates, chat messages, broadcasts, and reminders so you do not miss important moments when the app is closed.',
        icon: <Bell size={18} className="text-glass-orange" />,
      },
      {
        id: 'location',
        title: 'Location',
        description:
          'Used only when you turn on location sharing (e.g., coordinating meetups and tracking trip movement).',
        icon: <MapPin size={18} className="text-pink-300" />,
      },
      {
        id: 'camera',
        title: 'Camera',
        description:
          'Used when you take photos or scan documents within trips. Requested just-in-time when needed.',
        icon: <Camera size={18} className="text-emerald-300" />,
      },
      {
        id: 'microphone',
        title: 'Microphone',
        description:
          'Used for AI Concierge voice conversations when you tap the mic button in chat.',
        icon: <Mic size={18} className="text-indigo-300" />,
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

      const next: Record<PermissionId, PermissionStatus> = entries.reduce(
        (acc, [id, status]) => {
          acc[id] = status;
          return acc;
        },
        {} as Record<PermissionId, PermissionStatus>,
      );

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

  const handleToggleChange = useCallback(
    async (id: PermissionId, checked: boolean) => {
      const status = statuses?.[id];
      if (!status) return;

      if (checked) {
        // Toggle ON: trigger just-in-time permission request
        await handleRequest(id);
        return;
      }

      // Toggle OFF: user wants to revoke — we can't do that from JS
      const canOpenSettings = status.canOpenSettings ?? false;
      toast({
        title: 'Revoke in Settings',
        description:
          'To turn off this permission, open iOS Settings → Chravel and toggle it off there.',
        action: canOpenSettings ? (
          <ToastAction altText="Open Settings" onClick={() => void handleOpenSettings()}>
            Open Settings
          </ToastAction>
        ) : undefined,
      });
    },
    [statuses, handleRequest, handleOpenSettings, toast],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon size={22} className="text-glass-orange" />
            Permissions Center
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            We only ask for permissions when you use a feature. You can review and update access
            here anytime.
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
          const detail = status?.detail;

          const isGranted = state === 'granted';
          const isNotApplicable = state === 'not_applicable';
          const isDisabled = isNotApplicable || busyId === card.id;

          return (
            <div key={card.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">{card.icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-white font-semibold">{card.title}</div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${badgeClasses(state)}`}
                      >
                        {formatState(state)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{card.description}</p>
                    {detail && <p className="text-xs text-gray-500 mt-2">{detail}</p>}
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center">
                  <Switch
                    checked={isGranted}
                    disabled={isDisabled}
                    onCheckedChange={checked => void handleToggleChange(card.id, checked)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
