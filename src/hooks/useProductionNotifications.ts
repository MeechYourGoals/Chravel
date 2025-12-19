
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { productionNotificationService, NotificationPreference } from '../services/productionNotificationService';

export interface ProductionNotificationState {
  permission: NotificationPermission;
  token: string | null;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  preferences: NotificationPreference | null;
}

export const useProductionNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ProductionNotificationState>({
    permission: 'default',
    token: null,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
    isLoading: false,
    error: null,
    preferences: null
  });

  useEffect(() => {
    if (!state.isSupported || !user) return;

    const initializeNotifications = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Initialize the notification service
        await productionNotificationService.initialize();

        // Load user preferences
        const preferences = await productionNotificationService.getNotificationPreferences(user.id);
        setState(prev => ({ ...prev, preferences }));

        // Check current permission status
        const permission = await productionNotificationService.requestPermission();
        setState(prev => ({ ...prev, permission }));

        if (permission === 'granted') {
          // Subscribe to push notifications
          const token = await productionNotificationService.subscribeToPush(user.id);
          setState(prev => ({ ...prev, token }));
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Failed to initialize notifications'
        }));
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeNotifications();
  }, [user, state.isSupported]);

  const requestPermission = async () => {
    if (!state.isSupported) {
      throw new Error('Notifications not supported');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await productionNotificationService.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission === 'granted' && user) {
        const token = await productionNotificationService.subscribeToPush(user.id);
        setState(prev => ({ ...prev, token }));
      }

      return permission;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permission';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreference>) => {
    if (!user) return;

    try {
      const success = await productionNotificationService.updateNotificationPreferences(user.id, updates);
      if (success) {
        setState(prev => ({
          ...prev,
          preferences: prev.preferences ? { ...prev.preferences, ...updates } : null
        }));
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  const sendTestNotification = async (title: string, body: string) => {
    if (!state.isSupported) {
      throw new Error('Notifications not supported');
    }

    try {
      await productionNotificationService.sendLocalNotification({
        title,
        body,
        icon: '/chravel-logo.png'
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    if (!user) return;

    try {
      await productionNotificationService.unsubscribe(user.id);
      setState(prev => ({ ...prev, token: null }));
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      throw error;
    }
  };

  return {
    ...state,
    requestPermission,
    updatePreferences,
    sendTestNotification,
    unsubscribe
  };
};
