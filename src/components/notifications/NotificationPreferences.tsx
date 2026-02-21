/**
 * Notification Preferences Component
 * 
 * Allows users to configure:
 * - Which channels to receive notifications (push, email, SMS)
 * - Which types of notifications to receive
 * - Quiet hours
 */

import React, { useState, useEffect } from 'react';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Moon, Mail, MessageSquare, DollarSign, Calendar, Users, Megaphone } from 'lucide-react';
import { userPreferencesService, NotificationPreferences as NotificationPrefs } from '@/services/userPreferencesService';
import { useAuth } from '@/hooks/useAuth';

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    chat_messages: false,
    mentions_only: false,
    broadcasts: true,
    tasks: true,
    payments: true,
    calendar_events: true,
    calendar_reminders: true,
    polls: true,
    trip_invites: true,
    join_requests: true,
    basecamp_updates: true,
    quiet_hours_enabled: false,
    quiet_start: '22:00',
    quiet_end: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const preferences = await userPreferencesService.getNotificationPreferences(user.id);
      setPrefs(preferences);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load notification preferences:', error);
      }
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPrefs, value: any) => {
    if (!user?.id) {
      toast.error('You must be logged in to update preferences');
      return;
    }

    // Optimistically update local state
    setPrefs(prev => ({ ...prev, [key]: value }));

    try {
      await userPreferencesService.updateNotificationPreferences(user.id, {
        [key]: value
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to update notification preference:', error);
      }
      // Rollback on error - reload preferences
      await loadPreferences();
      toast.error('Failed to update preference');
    }
  };

  const saveAllPreferences = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to save preferences');
      return;
    }

    setSaving(true);
    try {
      await userPreferencesService.updateNotificationPreferences(user.id, prefs);
      toast.success('Notification preferences saved!');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to save notification preferences:', error);
      }
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Manage how and when you receive notifications
          </p>
        </div>
        <Bell className="h-8 w-8 text-primary" />
      </div>
      
      {/* Channels */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h4 className="font-semibold text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notification Channels
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="push">Push Notifications</Label>
            </div>
            <Switch 
              id="push"
              checked={prefs.push_enabled}
              onCheckedChange={(v) => updatePreference('push_enabled', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="email">Email Notifications</Label>
            </div>
            <Switch 
              id="email"
              checked={prefs.email_enabled}
              onCheckedChange={(v) => updatePreference('email_enabled', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sms">SMS Notifications</Label>
            </div>
            <Switch 
              id="sms"
              checked={prefs.sms_enabled}
              onCheckedChange={(v) => updatePreference('sms_enabled', v)}
            />
          </div>
        </div>
      </div>
      
      {/* Categories */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h4 className="font-semibold text-lg">What to notify me about</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="broadcasts">Broadcast messages</Label>
            </div>
            <Switch 
              id="broadcasts"
              checked={prefs.broadcasts}
              onCheckedChange={(v) => updatePreference('broadcasts', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="tasks">Task assignments</Label>
            </div>
            <Switch 
              id="tasks"
              checked={prefs.tasks}
              onCheckedChange={(v) => updatePreference('tasks', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="payments">Payment requests</Label>
            </div>
            <Switch 
              id="payments"
              checked={prefs.payments}
              onCheckedChange={(v) => updatePreference('payments', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="calendar">Calendar event reminders</Label>
            </div>
            <Switch 
              id="calendar"
              checked={prefs.calendar_reminders}
              onCheckedChange={(v) => updatePreference('calendar_reminders', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="invites">Trip invitations</Label>
            </div>
            <Switch 
              id="invites"
              checked={prefs.trip_invites}
              onCheckedChange={(v) => updatePreference('trip_invites', v)}
            />
          </div>
        </div>
      </div>
      
      {/* Quiet Hours */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h4 className="font-semibold text-lg flex items-center gap-2">
          <Moon className="h-5 w-5" />
          Quiet Hours
        </h4>
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label htmlFor="quiet">Enable quiet hours</Label>
            <p className="text-xs text-muted-foreground">
              Pause non-urgent notifications during these hours
            </p>
          </div>
          <Switch 
            id="quiet"
            checked={prefs.quiet_hours_enabled}
            onCheckedChange={(v) => updatePreference('quiet_hours_enabled', v)}
          />
        </div>
        
        {prefs.quiet_hours_enabled && (
          <div className="flex gap-4 items-center ml-6">
            <div>
              <Label htmlFor="quiet_start" className="text-xs">From</Label>
              <input
                id="quiet_start"
                type="time"
                value={prefs.quiet_start}
                onChange={(e) => updatePreference('quiet_start', e.target.value)}
                className="block mt-1 px-3 py-2 border rounded bg-background"
              />
            </div>
            <span className="mt-6">to</span>
            <div>
              <Label htmlFor="quiet_end" className="text-xs">Until</Label>
              <input
                id="quiet_end"
                type="time"
                value={prefs.quiet_end}
                onChange={(e) => updatePreference('quiet_end', e.target.value)}
                className="block mt-1 px-3 py-2 border rounded bg-background"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={loadPreferences}
          disabled={saving}
        >
          Reset
        </Button>
        <Button
          onClick={saveAllPreferences}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};
