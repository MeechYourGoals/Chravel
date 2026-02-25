import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ExternalLink, Settings, Download, Crown, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CalendarEvent } from '@/types/calendar';
import { calendarExporter } from '@/utils/calendarExport';
import { useToast } from '@/hooks/use-toast';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripName: string;
  events: CalendarEvent[];
}

interface CalendarProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  connected: boolean;
  syncEnabled: boolean;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
  tripName,
  events,
}) => {
  const { toast } = useToast();
  const { tier, upgradeToTier, isLoading: isUpgrading } = useConsumerSubscription();

  // Calendar Sync requires Explorer+ tier (ICS download is free for all)
  const hasSyncAccess = tier === 'explorer' || tier === 'frequent-chraveler';

  const [providers, setProviders] = useState<CalendarProvider[]>([
    {
      id: 'google',
      name: 'Google Calendar',
      icon: <Calendar className="w-5 h-5" />,
      color: 'bg-blue-500',
      description: 'Sync with your Google Calendar',
      connected: false,
      syncEnabled: false,
    },
    {
      id: 'outlook',
      name: 'Outlook Calendar',
      icon: <Calendar className="w-5 h-5" />,
      color: 'bg-blue-600',
      description: 'Sync with Microsoft Outlook',
      connected: false,
      syncEnabled: false,
    },
    {
      id: 'apple',
      name: 'Apple Calendar',
      icon: <Calendar className="w-5 h-5" />,
      color: 'bg-gray-800',
      description: 'Sync with Apple Calendar',
      connected: false,
      syncEnabled: false,
    },
  ]);

  const handleConnect = async (providerId: string) => {
    // Check subscription first
    if (!hasSyncAccess) {
      toast({
        title: 'Upgrade Required',
        description: 'Calendar sync is available with Explorer and Frequent Chraveler plans.',
        variant: 'destructive',
      });
      return;
    }

    // This would normally trigger OAuth flow
    toast({
      title: 'API Key Required',
      description: `Please configure ${providerId} Calendar API credentials in your environment.`,
      variant: 'destructive',
    });
  };

  const handleSyncToggle = (providerId: string, enabled: boolean) => {
    setProviders(prev =>
      prev.map(provider =>
        provider.id === providerId ? { ...provider, syncEnabled: enabled } : provider,
      ),
    );
  };

  const handleExportICS = () => {
    calendarExporter.downloadICS(events, tripName);
    toast({
      title: 'Calendar Exported',
      description: 'Your trip calendar has been downloaded as an ICS file.',
    });
  };

  const handleQuickAdd = (event: CalendarEvent) => {
    const urls = calendarExporter.generateCalendarUrls(event);
    // Open Google Calendar by default
    window.open(urls.google, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar Sync & Export
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Export</CardTitle>
              <CardDescription>
                Download your trip calendar or add events to your calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleExportICS} variant="outline" className="min-h-[44px]">
                  <Download className="w-4 h-4 mr-2" />
                  Download ICS File
                </Button>
                <Button
                  onClick={() => handleQuickAdd(events[0])}
                  variant="outline"
                  disabled={events.length === 0}
                  className="min-h-[44px]"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Add to Google Calendar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {events.length} events ready to export
              </p>
            </CardContent>
          </Card>

          {/* Calendar Providers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Calendar Integrations</h3>
              {!hasSyncAccess && (
                <Badge
                  variant="secondary"
                  className="bg-amber-500/20 text-amber-300 border-amber-500/30"
                >
                  <Crown className="w-3 h-3 mr-1" />
                  Explorer+
                </Badge>
              )}
            </div>

            {/* Upgrade prompt for free users */}
            {!hasSyncAccess && (
              <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">Upgrade to Sync Calendars</h4>
                      <p className="text-sm text-muted-foreground">
                        Auto-sync trip events with Google, Outlook, or Apple Calendar.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => upgradeToTier('explorer', 'monthly')}
                      disabled={isUpgrading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 min-h-[44px]"
                    >
                      {isUpgrading ? 'Processing...' : 'Explorer $9.99/mo'}
                    </Button>
                    <Button
                      onClick={() => upgradeToTier('frequent-chraveler', 'monthly')}
                      disabled={isUpgrading}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 min-h-[44px]"
                    >
                      {isUpgrading ? 'Processing...' : 'Frequent Chraveler $19.99/mo'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {providers.map(provider => (
              <Card key={provider.id} className={!hasSyncAccess ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${provider.color} text-white`}>
                        {provider.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{provider.name}</h4>
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!hasSyncAccess ? (
                        <Badge variant="secondary" className="text-muted-foreground">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </Badge>
                      ) : provider.connected ? (
                        <>
                          <Badge variant="secondary">Connected</Badge>
                          <Switch
                            checked={provider.syncEnabled}
                            onCheckedChange={checked => handleSyncToggle(provider.id, checked)}
                          />
                        </>
                      ) : (
                        <Button
                          onClick={() => handleConnect(provider.id)}
                          size="sm"
                          variant="outline"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sync Settings */}
          <Card className={!hasSyncAccess ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Sync Settings
                {!hasSyncAccess && <Lock className="w-4 h-4 text-muted-foreground" />}
              </CardTitle>
              <CardDescription>Control how your trip events are synchronized</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Auto-sync new events</span>
                <Switch defaultChecked disabled={!hasSyncAccess} />
              </div>
              <div className="flex items-center justify-between">
                <span>Sync event updates</span>
                <Switch defaultChecked disabled={!hasSyncAccess} />
              </div>
              <div className="flex items-center justify-between">
                <span>Include private events</span>
                <Switch disabled={!hasSyncAccess} />
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
