/**
 * Privacy Settings Section
 * Control data visibility and privacy preferences
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export const PrivacySettingsSection: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState({
    showEmail: true,
    showPhone: false,
    showLocation: true,
    allowAnalytics: true,
    shareTrips: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: 'Privacy settings updated',
      description: 'Your changes have been saved',
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Privacy Settings</h3>
          <p className="text-sm text-muted-foreground">
            Control what information is visible to other users
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Email Address</Label>
              <p className="text-sm text-muted-foreground">Allow trip members to see your email</p>
            </div>
            <Switch
              checked={settings.showEmail}
              onCheckedChange={() => handleToggle('showEmail')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Phone Number</Label>
              <p className="text-sm text-muted-foreground">Allow trip members to see your phone</p>
            </div>
            <Switch
              checked={settings.showPhone}
              onCheckedChange={() => handleToggle('showPhone')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Real-time Location</Label>
              <p className="text-sm text-muted-foreground">
                Share your location during active trips
              </p>
            </div>
            <Switch
              checked={settings.showLocation}
              onCheckedChange={() => handleToggle('showLocation')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Usage Analytics</Label>
              <p className="text-sm text-muted-foreground">
                Help improve Chravel with anonymous usage data
              </p>
            </div>
            <Switch
              checked={settings.allowAnalytics}
              onCheckedChange={() => handleToggle('allowAnalytics')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Trip Sharing</Label>
              <p className="text-sm text-muted-foreground">Allow others to invite you to trips</p>
            </div>
            <Switch
              checked={settings.shareTrips}
              onCheckedChange={() => handleToggle('shareTrips')}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
