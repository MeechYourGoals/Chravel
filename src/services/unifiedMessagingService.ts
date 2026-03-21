import { supabase } from '@/integrations/supabase/client';
import { retryWithBackoff } from '@/utils/retry';
export interface Message {
  id: string;
  trip_id: string;
  content: string;
  author_name: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  reply_to_id?: string;
  thread_id?: string;
  is_edited?: boolean;
  edited_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  attachments?: Array<{
    type: 'image' | 'video' | 'file';
    url: string;
    name?: string;
  }>;
  media_type?: string | null;
  media_url?: string | null;
  link_preview?: Record<string, unknown>;
  privacy_mode?: string;
  privacy_encrypted?: boolean;
  message_type?: 'text' | 'broadcast' | 'payment' | 'system';
}

export interface SendMessageOptions {
  content: string;
  tripId: string;
  userName: string;
  userId?: string;
  replyToId?: string;
  threadId?: string;
  privacyMode?: string;
  attachments?: Array<{ type: string; url: string; name?: string }>;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  tripType: string;
  placeholders: string[];
}

export interface ScheduledMessageRequest {
  content: string;
  sendAt: Date;
  tripId?: string;
  tourId?: string;
  userId: string;
  priority?: 'urgent' | 'reminder' | 'fyi';
  isRecurring?: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly';
  recurrenceEnd?: Date;
  templateId?: string;
}

export interface ScheduledMessage {
  id: string;
  user_id: string;
  trip_id?: string;
  tour_id?: string;
  content: string;
  send_at: string;
  priority?: 'urgent' | 'reminder' | 'fyi';
  is_recurring?: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'monthly';
  recurrence_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

class UnifiedMessagingService {
  /**
   * @deprecated Use the realtime subscription in `useTripChat` instead.
   * This used to create a parallel channel (`trip-messages:{tripId}`) that
   * duplicated the `trip_chat_{tripId}` channel managed by useTripChat,
   * doubling CDC load for no benefit. Removed in messaging architecture review.
   * Returns a no-op unsubscribe for backward compatibility.
   */
  async subscribeToTrip(
    _tripId: string,
    _onMessage: (message: Message) => void,
  ): Promise<() => void> {
    return () => {};
  }

  /**
   * Send a message to a trip
   */
  async sendMessage(options: SendMessageOptions): Promise<Message> {
    return retryWithBackoff(
      async () => {
        const { data, error } = await supabase
          .from('trip_chat_messages')
          .insert({
            trip_id: options.tripId,
            content: options.content,
            author_name: options.userName,
            sender_display_name: options.userName,
            user_id: options.userId,
            privacy_mode: options.privacyMode || 'standard',
            reply_to_id: options.replyToId,
            thread_id: options.threadId,
            attachments: options.attachments || [],
          })
          .select()
          .single();

        if (error) throw error;
        return this.transformMessage(data);
      },
      {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          if (import.meta.env.DEV) {
            console.warn(`Retry attempt ${attempt}/3 for sending message:`, error.message);
          }
        },
      },
    );
  }

  /**
   * Get message history for a trip
   */
  async getMessages(tripId: string, limit = 50, before?: Date): Promise<Message[]> {
    let query = supabase
      .from('trip_chat_messages')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.transformMessage).reverse();
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('trip_chat_messages')
      .update({
        content,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw error;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('trip_chat_messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw error;
  }

  /**
   * Get unread count for a trip
   */
  async getUnreadCount(tripId: string, userId: string, lastReadAt: Date): Promise<number> {
    const { count, error } = await supabase
      .from('trip_chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .neq('user_id', userId)
      .gt('created_at', lastReadAt.toISOString());

    if (error) throw error;
    return count || 0;
  }

  /**
   * Schedule a message for later delivery
   */
  async scheduleMessage(
    request: ScheduledMessageRequest,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('schedule-message', {
        body: {
          content: request.content,
          send_at: request.sendAt.toISOString(),
          trip_id: request.tripId,
          tour_id: request.tourId,
          user_id: request.userId,
          priority: request.priority || 'fyi',
          is_recurring: request.isRecurring || false,
          recurrence_type: request.recurrenceType,
          recurrence_end: request.recurrenceEnd?.toISOString(),
          template_id: request.templateId,
        },
      });

      if (error) throw error;
      return { success: true, id: data.id };
    } catch (error) {
      console.error('Failed to schedule message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get message templates
   */
  async getMessageTemplates(tripType?: string, category?: string): Promise<MessageTemplate[]> {
    try {
      const { data, error } = await supabase.functions.invoke('get-message-templates', {
        body: { tripType, category },
      });

      if (error) throw error;
      return data.templates || [];
    } catch (error) {
      console.error('Failed to fetch message templates:', error);
      return [];
    }
  }

  /**
   * Fill template with context
   */
  fillTemplate(template: string, context: Record<string, string>): string {
    let filledTemplate = template;

    // Replace placeholders like {{placeholder}} with context values
    Object.entries(context).forEach(([key, value]) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      filledTemplate = filledTemplate.replace(placeholder, value || `[${key}]`);
    });

    return filledTemplate;
  }

  /**
   * Clean up all subscriptions.
   * @deprecated No longer manages realtime channels — subscribeToTrip is a no-op.
   */
  cleanup(): void {
    // No-op: realtime channels are now managed solely by useTripChat
  }

  private transformMessage(data: Record<string, unknown>): Message {
    return {
      id: data.id as string,
      trip_id: data.trip_id as string,
      content: data.content as string,
      author_name: data.author_name as string,
      user_id: data.user_id as string | undefined,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
      reply_to_id: data.reply_to_id as string | undefined,
      thread_id: data.thread_id as string | undefined,
      is_edited: data.is_edited as boolean | undefined,
      edited_at: data.edited_at as string | undefined,
      is_deleted: data.is_deleted as boolean | undefined,
      deleted_at: data.deleted_at as string | undefined,
      attachments: (data.attachments || []) as Message['attachments'],
      media_type: data.media_type as string | null | undefined,
      media_url: data.media_url as string | null | undefined,
      link_preview: data.link_preview as Record<string, unknown> | undefined,
      privacy_mode: data.privacy_mode as string | undefined,
      privacy_encrypted: data.privacy_encrypted as boolean | undefined,
      message_type: data.message_type as Message['message_type'],
    };
  }

  /**
   * Get scheduled messages for a user
   */
  async getScheduledMessages(
    userId: string,
    tripId?: string,
    tourId?: string,
  ): Promise<ScheduledMessage[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scheduled_messages table not in generated types yet
      const { data, error } = await (supabase as any)
        .from('scheduled_messages')
        .select('*')
        .eq('user_id', userId)
        .eq(tripId ? 'trip_id' : 'tour_id', tripId || tourId)
        .order('send_at', { ascending: true });

      if (error) throw error;
      return (data || []) as ScheduledMessage[];
    } catch (error) {
      console.error('Failed to get scheduled messages:', error);
      return [];
    }
  }

  /**
   * Update a scheduled message
   */
  async updateScheduledMessage(
    messageId: string,
    updates: Partial<ScheduledMessage>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scheduled_messages table not in generated types yet
      const { error } = await (supabase as any)
        .from('scheduled_messages')
        .update(updates)
        .eq('id', messageId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to update scheduled message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scheduled_messages table not in generated types yet
      const { error } = await (supabase as any)
        .from('scheduled_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel scheduled message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const unifiedMessagingService = new UnifiedMessagingService();
