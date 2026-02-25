/**
 * Notification Preferences Hook
 *
 * Manages user notification preferences with backend persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  trip_updates: boolean;
  chat_messages: boolean;
  calendar_reminders: boolean;
  payment_requests: boolean;
  task_assignments: boolean;
  broadcasts: boolean;
  rsvp_updates: boolean;
  event_reminders: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_enabled: true,
  push_enabled: true,
  trip_updates: true,
  chat_messages: false,
  calendar_reminders: true,
  payment_requests: true,
  task_assignments: true,
  broadcasts: true,
  rsvp_updates: true,
  event_reminders: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Failed to load notification preferences:', error);
        return;
      }

      if (data?.notification_settings) {
        setPreferences(data.notification_settings as NotificationPreferences);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updatePreferences = useCallback(
    async (newPreferences: Partial<NotificationPreferences>) => {
      if (!user) return;

      try {
        setIsSaving(true);

        const updatedPreferences = {
          ...preferences,
          ...newPreferences,
        };

        const { error } = await supabase
          .from('profiles')
          .update({
            notification_settings: updatedPreferences,
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to update notification preferences:', error);
          toast({
            title: 'Error',
            description: 'Failed to save notification preferences. Please try again.',
            variant: 'destructive',
          });
          return;
        }

        setPreferences(updatedPreferences);
        toast({
          title: 'Success',
          description: 'Notification preferences updated successfully.',
        });
      } catch (error) {
        console.error('Failed to update notification preferences:', error);
        toast({
          title: 'Error',
          description: 'Failed to save notification preferences. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [user, preferences, toast],
  );

  const updatePreference = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      updatePreferences({ [key]: value });
    },
    [updatePreferences],
  );

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Listen for realtime subscription updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notification-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          // Handle subscription-related notifications
          if (payload.new.type === 'subscription') {
            toast({
              title: payload.new.title,
              description: payload.new.message,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreference,
    updatePreferences,
    refresh: loadPreferences,
  };
}
