import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { notificationService } from '../services/notificationService';

export interface NotificationHookState {
  permission: NotificationPermission;
  token: string | null;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationHookState>({
    permission: 'default',
    token: null,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
    isLoading: false,
    error: null
  });

  useEffect(() => {
    if (!state.isSupported || !user) return;

    const initializeNotifications = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Initialize the notification service
        await notificationService.initialize();

        // Check current permission status
        const permission = await notificationService.requestPermission();
        setState(prev => ({ ...prev, permission }));

        if (permission === 'granted') {
          // Subscribe to push notifications
          const token = await notificationService.subscribeToPush(user.id);
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
      const permission = await notificationService.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission === 'granted' && user) {
        const token = await notificationService.subscribeToPush(user.id);
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

  const unsubscribe = async () => {
    if (!user) return;

    try {
      await notificationService.unsubscribe(user.id);
      setState(prev => ({ ...prev, token: null }));
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      throw error;
    }
  };

  const sendTestNotification = async (title: string, body: string) => {
    if (!state.isSupported) {
      throw new Error('Notifications not supported');
    }

    try {
      await notificationService.sendLocalNotification({
        title,
        body,
        icon: '/chravel-logo.png'
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  };

  return {
    ...state,
    requestPermission,
    unsubscribe,
    sendTestNotification
  };
};