import { isDespia, sendLocalPush } from '@/native/despia';

import { supabase } from '../integrations/supabase/client';

export interface NotificationPreference {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  tripUpdates: boolean;
  chatMessages: boolean;
  calendarReminders: boolean;
  paymentAlerts: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class ProductionNotificationService {
  private static instance: ProductionNotificationService;
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private fcmVapidKey: string | null = null;

  private constructor() {}

  static getInstance(): ProductionNotificationService {
    if (!ProductionNotificationService.instance) {
      ProductionNotificationService.instance = new ProductionNotificationService();
    }
    return ProductionNotificationService.instance;
  }

  async initialize() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.serviceWorker = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } catch (error) {
        if (import.meta.env.DEV) console.error('Service Worker registration failed:', error);
      }
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      if (import.meta.env.DEV) console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  async subscribeToPush(userId: string): Promise<string | null> {
    if (!this.serviceWorker) {
      await this.initialize();
    }

    if (!this.serviceWorker || !this.fcmVapidKey) {
      if (import.meta.env.DEV) console.error('Service Worker or VAPID key not available');
      return null;
    }

    try {
      const subscription = await (this.serviceWorker as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.fcmVapidKey),
      });

      const token = JSON.stringify(subscription);

      // Save token to database
      await this.savePushToken(userId, token, 'web');

      return token;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Push subscription failed:', error);
      return null;
    }
  }

  async savePushToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceId?: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'save_token',
          userId,
          token,
          platform,
          deviceId,
        },
      });

      if (error) {
        if (import.meta.env.DEV) console.error('Error saving push token:', error);
        return false;
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error saving push token:', error);
      return false;
    }
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        if (import.meta.env.DEV) console.error('Error getting notification preferences:', error);
        return null;
      }

      if (!data) {
        // Create default preferences
        const defaultPrefs: Partial<NotificationPreference> = {
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: false,
          tripUpdates: true,
          chatMessages: true,
          calendarReminders: true,
          paymentAlerts: true,
          quietHoursEnabled: false,
          quietStart: '22:00',
          quietEnd: '08:00',
        };

        await this.updateNotificationPreferences(userId, defaultPrefs);
        return {
          userId,
          ...defaultPrefs,
        } as NotificationPreference;
      }

      return {
        userId: (data as any).user_id,
        pushEnabled: (data as any).push_enabled,
        emailEnabled: (data as any).email_enabled,
        smsEnabled: (data as any).sms_enabled,
        tripUpdates: (data as any).trip_updates,
        chatMessages: (data as any).chat_messages,
        calendarReminders: (data as any).calendar_reminders,
        paymentAlerts: (data as any).payment_alerts,
        quietHoursEnabled: (data as any).quiet_hours_enabled,
        quietStart: (data as any).quiet_start,
        quietEnd: (data as any).quiet_end,
      };
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error getting notification preferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreference>,
  ): Promise<boolean> {
    try {
      const { error } = await (supabase as any).from('notification_preferences').upsert({
        user_id: userId,
        push_enabled: preferences.pushEnabled,
        email_enabled: preferences.emailEnabled,
        sms_enabled: preferences.smsEnabled,
        trip_updates: preferences.tripUpdates,
        chat_messages: preferences.chatMessages,
        calendar_reminders: preferences.calendarReminders,
        payment_alerts: preferences.paymentAlerts,
        quiet_hours_enabled: preferences.quietHoursEnabled,
        quiet_start: preferences.quietStart,
        quiet_end: preferences.quietEnd,
      });

      if (error) {
        if (import.meta.env.DEV) console.error('Error updating notification preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  async sendPushNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'send_push',
          userId,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          icon: payload.icon,
          badge: payload.badge,
        },
      });

      if (error) {
        if (import.meta.env.DEV) console.error('Failed to send push notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error sending push notification:', error);
      return false;
    }
  }

  async sendEmailNotification(userId: string, subject: string, content: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'send_email',
          userId,
          subject,
          content,
        },
      });

      if (error) {
        if (import.meta.env.DEV) console.error('Failed to send email notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error sending email notification:', error);
      return false;
    }
  }

  async sendSMSNotification(userId: string, message: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'send_sms',
          userId,
          message,
        },
      });

      if (error) {
        if (import.meta.env.DEV) console.error('Failed to send SMS notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error sending SMS notification:', error);
      return false;
    }
  }

  async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    if (isDespia()) {
      const url = typeof payload.data?.url === 'string' ? payload.data.url : '';
      sendLocalPush(payload.title, payload.body, 0, url);
      return;
    }

    if (Notification.permission !== 'granted') {
      if (import.meta.env.DEV) console.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/chravel-logo.png',
        badge: payload.badge || '/chravel-logo.png',
        data: payload.data,
        requireInteraction: true,
      });

      notification.onclick = event => {
        event.preventDefault();
        window.focus();
        if (payload.data?.url) {
          window.open(payload.data.url, '_self');
        }
      };

      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to show notification:', error);
    }
  }

  async unsubscribe(userId: string): Promise<void> {
    try {
      if (this.serviceWorker) {
        const subscription = await (this.serviceWorker as any).pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();

          // Remove from database
          await supabase.functions.invoke('push-notifications', {
            body: {
              action: 'remove_token',
              userId,
              token: JSON.stringify(subscription),
            },
          });
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error unsubscribing from notifications:', error);
    }
  }

  setVapidKey(key: string): void {
    this.fcmVapidKey = key;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray as Uint8Array<ArrayBuffer>;
  }

  isQuietHours(preferences: NotificationPreference): boolean {
    if (!preferences.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const startTime = parseInt(preferences.quietStart.replace(':', ''));
    const endTime = parseInt(preferences.quietEnd.replace(':', ''));

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  }
}

export const productionNotificationService = ProductionNotificationService.getInstance();
