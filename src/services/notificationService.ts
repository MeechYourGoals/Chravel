import { supabase } from '../integrations/supabase/client';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// ============================================================================
// Types
// ============================================================================

export interface NotificationPreference {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  // These map to the actual database columns
  broadcasts: boolean;
  chatMessages: boolean;
  calendarEvents: boolean;
  payments: boolean;
  tasks: boolean;
  polls: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: Date;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  tag?: string;
  requireInteraction?: boolean;
}

export type NotificationType =
  | 'chat_message' // @deprecated - permanently suppressed
  | 'itinerary_update'
  | 'payment_request'
  | 'payment_split'
  | 'trip_reminder'
  | 'trip_invite'
  | 'poll_vote'
  | 'task_assigned'
  | 'broadcast'
  | 'mention' // @deprecated - permanently suppressed
  | 'calendar_bulk_import'
  | 'join_request'
  | 'basecamp_update';

export interface WebPushSendRequest {
  userIds?: string[];
  tripId?: string;
  excludeUserId?: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  tag?: string;
  requireInteraction?: boolean;
  ttl?: number;
}

// ============================================================================
// Notification Service
// ============================================================================

export class NotificationService {
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private isInitialized = false;

  /**
   * Initialize the notification service
   * Registers service worker and checks for existing subscription
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // Wait for service worker to be ready
        this.serviceWorker = await navigator.serviceWorker.ready;
        this.isInitialized = true;
        console.log('[NotificationService] Initialized successfully');
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[NotificationService] Service Worker registration failed:', error);
        }
      }
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      if (import.meta.env.DEV) {
        console.warn('[NotificationService] This browser does not support notifications');
      }
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

  /**
   * Subscribe to Web Push notifications
   * Creates a subscription and saves it to Supabase
   */
  async subscribeToPush(userId: string): Promise<string | null> {
    if (!this.serviceWorker) {
      await this.initialize();
    }

    if (!this.serviceWorker) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Service Worker not available');
      }
      return null;
    }

    if (!VAPID_PUBLIC_KEY) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] VITE_VAPID_PUBLIC_KEY not configured');
      }
      return null;
    }

    try {
      // Check for existing subscription
      let subscription = await (this.serviceWorker as any).pushManager.getSubscription();

      // Create new subscription if none exists
      if (!subscription) {
        subscription = await (this.serviceWorker as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Save subscription to Supabase
      const subscriptionJSON = subscription.toJSON();
      const keys = subscriptionJSON.keys;

      if (!keys?.p256dh || !keys?.auth) {
        console.error('[NotificationService] Subscription missing required keys');
        return null;
      }

      const { error } = await supabase.from('web_push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh_key: keys.p256dh,
          auth_key: keys.auth,
          user_agent: navigator.userAgent,
          device_name: this.getDeviceName(),
          is_active: true,
          failed_count: 0,
        },
        {
          onConflict: 'user_id,endpoint',
        },
      );

      if (error) {
        console.error('[NotificationService] Failed to save subscription:', error);
        return null;
      }

      console.log('[NotificationService] Subscription saved successfully');
      return JSON.stringify(subscriptionJSON);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Push subscription failed:', error);
      }
      return null;
    }
  }

  /**
   * Get user-friendly device name from user agent
   */
  private getDeviceName(): string {
    const ua = navigator.userAgent;

    let browser = 'Unknown Browser';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Opera')) browser = 'Opera';

    let os = 'Unknown OS';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  }

  /**
   * Save FCM/APNs push token (for native apps)
   */
  async savePushToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('push_device_tokens').upsert(
        {
          user_id: userId,
          token,
          platform,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        },
      );

      if (error) {
        console.error('[NotificationService] Error saving push token:', error);
        return false;
      }
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Error saving push token:', error);
      }
      return false;
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Return default preferences if none exist
        return {
          userId,
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: false,
          broadcasts: true,
          chatMessages: false,
          calendarEvents: true,
          payments: true,
          tasks: true,
          polls: true,
          quietHoursEnabled: false,
          quietStart: '22:00',
          quietEnd: '08:00',
        };
      }

      return {
        userId: data.user_id,
        pushEnabled: data.push_enabled ?? true,
        emailEnabled: data.email_enabled ?? true,
        smsEnabled: data.sms_enabled ?? false,
        broadcasts: data.broadcasts ?? true,
        chatMessages: data.chat_messages ?? false,
        calendarEvents: data.calendar_events ?? true,
        payments: data.payments ?? true,
        tasks: data.tasks ?? true,
        polls: data.polls ?? true,
        quietHoursEnabled: data.quiet_hours_enabled ?? false,
        quietStart: data.quiet_start ?? '22:00',
        quietEnd: data.quiet_end ?? '08:00',
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Error getting notification preferences:', error);
      }
      return null;
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreference>,
  ): Promise<boolean> {
    try {
      // Build update object with proper typing
      const updateData = {
        user_id: userId,
        updated_at: new Date().toISOString(),
        ...(preferences.pushEnabled !== undefined && { push_enabled: preferences.pushEnabled }),
        ...(preferences.emailEnabled !== undefined && { email_enabled: preferences.emailEnabled }),
        ...(preferences.smsEnabled !== undefined && { sms_enabled: preferences.smsEnabled }),
        ...(preferences.broadcasts !== undefined && { broadcasts: preferences.broadcasts }),
        ...(preferences.chatMessages !== undefined && { chat_messages: preferences.chatMessages }),
        ...(preferences.calendarEvents !== undefined && {
          calendar_events: preferences.calendarEvents,
        }),
        ...(preferences.payments !== undefined && { payments: preferences.payments }),
        ...(preferences.tasks !== undefined && { tasks: preferences.tasks }),
        ...(preferences.polls !== undefined && { polls: preferences.polls }),
        ...(preferences.quietHoursEnabled !== undefined && {
          quiet_hours_enabled: preferences.quietHoursEnabled,
        }),
        ...(preferences.quietStart !== undefined && { quiet_start: preferences.quietStart }),
        ...(preferences.quietEnd !== undefined && { quiet_end: preferences.quietEnd }),
      };

      const { error } = await supabase.from('notification_preferences').upsert(updateData);

      if (error) {
        console.error('[NotificationService] Error updating preferences:', error);
        return false;
      }
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Error updating notification preferences:', error);
      }
      return false;
    }
  }

  /**
   * Send a local notification (directly via browser API)
   */
  async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    if (Notification.permission !== 'granted') {
      if (import.meta.env.DEV) {
        console.warn('[NotificationService] Notification permission not granted');
      }
      return;
    }

    try {
      // Use service worker to show notification (supports actions)
      if (this.serviceWorker) {
        await this.serviceWorker.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/chravel-logo.png',
          badge: payload.badge || '/chravel-badge.png',
          data: { ...payload.data, image: payload.image },
          actions: payload.actions,
          tag: payload.tag || `chravel-local-${Date.now()}`,
          requireInteraction: payload.requireInteraction ?? false,
          renotify: true,
        } as NotificationOptions);
      } else {
        // Fallback to basic Notification API (no actions support)
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/chravel-logo.png',
          badge: payload.badge || '/chravel-logo.png',
          data: payload.data,
          tag: payload.tag,
          requireInteraction: payload.requireInteraction ?? false,
        });

        notification.onclick = event => {
          event.preventDefault();
          window.focus();
          if (payload.data?.url && typeof payload.data.url === 'string') {
            window.open(payload.data.url, '_self');
          }
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Failed to show notification:', error);
      }
    }
  }

  /**
   * Send a push notification via Supabase Edge Function
   * This sends to ALL subscribed devices for the target users
   */
  async sendPushNotification(request: WebPushSendRequest): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('web-push-send', {
        body: request,
      });

      if (error) {
        console.error('[NotificationService] Error sending push notification:', error);
        return false;
      }

      console.log('[NotificationService] Push notification sent:', data);
      return data?.success ?? false;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Error sending push notification:', error);
      }
      return false;
    }
  }

  /**
   * Chat message notifications are permanently disabled.
   * Chat volume is too high for push/email/SMS delivery.
   * In-app chat continues to work normally.
   * @deprecated No longer sends notifications. Kept for API compatibility.
   */
  async notifyNewMessage(
    _tripId: string,
    _senderName: string,
    _messagePreview: string,
    _messageId: string,
    _excludeUserId?: string,
  ): Promise<boolean> {
    return false;
  }

  /**
   * Send notification for itinerary update
   */
  async notifyItineraryUpdate(
    tripId: string,
    tripName: string,
    updaterName: string,
    eventId?: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    return this.sendPushNotification({
      tripId,
      excludeUserId,
      type: 'itinerary_update',
      title: `${tripName} - Itinerary Updated`,
      body: `${updaterName} made changes to the itinerary`,
      icon: '/chravel-logo.png',
      data: {
        tripId,
        eventId,
        type: 'itinerary_update',
      },
      actions: [{ action: 'view', title: 'View Changes' }],
    });
  }

  /**
   * Send notification for payment request
   */
  async notifyPaymentRequest(
    tripId: string,
    requesterName: string,
    amount: string,
    description: string,
    paymentId: string,
    userIds: string[],
  ): Promise<boolean> {
    return this.sendPushNotification({
      userIds,
      type: 'payment_request',
      title: '💰 Payment Request',
      body: `${requesterName} requested ${amount} for "${description}"`,
      icon: '/chravel-logo.png',
      data: {
        tripId,
        paymentId,
        type: 'payment_request',
      },
      actions: [
        { action: 'pay', title: 'Pay Now' },
        { action: 'view', title: 'View Details' },
      ],
      requireInteraction: true,
    });
  }

  /**
   * Send 24-hour trip reminder
   */
  async notifyTripReminder(
    tripId: string,
    tripName: string,
    destination: string,
    userIds: string[],
  ): Promise<boolean> {
    return this.sendPushNotification({
      userIds,
      type: 'trip_reminder',
      title: `🧳 ${tripName} starts tomorrow!`,
      body: `Your trip to ${destination} begins in 24 hours. Make sure you're ready!`,
      icon: '/chravel-logo.png',
      data: {
        tripId,
        type: 'trip_reminder',
      },
      actions: [
        { action: 'view', title: 'View Trip' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      requireInteraction: true,
    });
  }

  /**
   * Send email notification via Edge Function
   */
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
        console.error('[NotificationService] Error sending email:', error);
        return false;
      }
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Error sending email notification:', error);
      }
      return false;
    }
  }

  /**
   * Send SMS notification via Edge Function
   * Truth-based: success only when Twilio returns a valid Message SID
   * @returns { success, sid?, status?, errorMessage?, errorCode? } for UI
   */
  async sendSMSNotification(
    userId: string,
    message: string,
  ): Promise<{
    success: boolean;
    sid?: string;
    status?: string;
    errorMessage?: string;
    errorCode?: number;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'send_sms',
          userId,
          message,
        },
      });

      const result = (data ?? {}) as {
        success?: boolean;
        sid?: string;
        status?: string;
        error?: string;
        message?: string;
        errorCode?: number;
        errorMessage?: string;
      };

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[NotificationService] SMS error:', error);
        }
        let errorMessage = (error as { message?: string }).message || 'Request failed';
        if (result?.message) errorMessage = result.message;
        else if (result?.error) errorMessage = result.error;
        else {
          try {
            const ctx = (
              error as { context?: { json?: () => Promise<{ message?: string; error?: string }> } }
            ).context;
            if (ctx?.json && typeof ctx.json === 'function') {
              const body = await ctx.json();
              if (body?.message) errorMessage = body.message;
              else if (body?.error) errorMessage = body.error;
            }
          } catch {
            // ignore
          }
        }
        return {
          success: false,
          errorMessage,
          errorCode: result?.errorCode,
        };
      }

      if (result.success === false) {
        return {
          success: false,
          errorMessage: result.message || result.error || 'SMS delivery failed',
          errorCode: result.errorCode,
        };
      }

      // Truth-based: only success if we have a valid Message SID from Twilio
      const hasValidSid =
        result.sid && typeof result.sid === 'string' && result.sid.startsWith('SM');
      if (!hasValidSid) {
        return {
          success: false,
          errorMessage: result.message || result.error || 'Twilio did not return a message SID',
          errorCode: result.errorCode,
        };
      }

      return {
        success: true,
        sid: result.sid,
        status: result.status,
      };
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Error sending SMS notification:', err);
      }
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, errorMessage: msg };
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(userId: string): Promise<void> {
    try {
      if (this.serviceWorker) {
        const subscription = await (this.serviceWorker as any).pushManager.getSubscription();
        if (subscription) {
          // Remove from database
          await supabase
            .from('web_push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', subscription.endpoint);

          // Unsubscribe from browser
          await subscription.unsubscribe();
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Error unsubscribing from notifications:', error);
      }
    }
  }

  /**
   * Check if currently in quiet hours
   */
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

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Convert base64url string to Uint8Array for applicationServerKey
   */
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
}

export const notificationService = new NotificationService();
