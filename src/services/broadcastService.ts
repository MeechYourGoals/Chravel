/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary until trip_members type instantiation fixed
import { supabase } from '@/integrations/supabase/client';

export interface Broadcast {
  id: string;
  trip_id: string;
  message: string;
  priority: 'urgent' | 'reminder' | 'fyi';
  created_by: string;
  created_at: string;
  updated_at: string;
  scheduled_for?: string;
  is_sent: boolean;
  attachment_urls?: string[];
  metadata: any;
}

export interface BroadcastReaction {
  id: string;
  broadcast_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface CreateBroadcastData {
  trip_id: string;
  message: string;
  priority?: 'urgent' | 'reminder' | 'fyi';
  scheduled_for?: string;
  attachment_urls?: string[];
  metadata?: any;
}

export const broadcastService = {
  async createBroadcast(broadcastData: CreateBroadcastData): Promise<Broadcast | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const insertData: any = {
        ...broadcastData,
        created_by: user.id,
        priority: broadcastData.priority || 'fyi',
        metadata: broadcastData.metadata || {},
        is_sent: !broadcastData.scheduled_for // If not scheduled, mark as sent immediately
      };

      // Add attachment_urls if provided
      if (broadcastData.attachment_urls && broadcastData.attachment_urls.length > 0) {
        insertData.attachment_urls = broadcastData.attachment_urls;
      }

      const { data, error } = await supabase
        .from('broadcasts')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Broadcast;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error creating broadcast:', error);
      }
      return null;
    }
  },

  async getTripBroadcasts(tripId: string): Promise<Broadcast[]> {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Broadcast[];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching broadcasts:', error);
      }
      return [];
    }
  },

  async updateBroadcast(broadcastId: string, updates: Partial<Broadcast>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('broadcasts')
        .update(updates)
        .eq('id', broadcastId);

      return !error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating broadcast:', error);
      }
      return false;
    }
  },

  async addReaction(broadcastId: string, reactionType: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('broadcast_reactions')
        .upsert({
          broadcast_id: broadcastId,
          user_id: user.id,
          reaction_type: reactionType
        }, {
          onConflict: 'broadcast_id,user_id'
        });

      return !error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error adding reaction:', error);
      }
      return false;
    }
  },

  async removeReaction(broadcastId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('broadcast_reactions')
        .delete()
        .eq('broadcast_id', broadcastId)
        .eq('user_id', user.id);

      return !error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error removing reaction:', error);
      }
      return false;
    }
  },

  async getBroadcastReactions(broadcastId: string): Promise<BroadcastReaction[]> {
    try {
      const { data, error } = await supabase
        .from('broadcast_reactions')
        .select('*')
        .eq('broadcast_id', broadcastId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching reactions:', error);
      }
      return [];
    }
  },

  // Subscribe to real-time broadcast updates
  subscribeToBroadcasts(tripId: string, callback: (broadcast: Broadcast) => void) {
    const channel = supabase
      .channel(`broadcasts-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'broadcasts',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => callback(payload.new as Broadcast)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  // Subscribe to real-time reaction updates
  subscribeToReactions(broadcastId: string, callback: (reaction: BroadcastReaction) => void) {
    const channel = supabase
      .channel(`reactions-${broadcastId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcast_reactions',
          filter: `broadcast_id=eq.${broadcastId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            callback(payload.new as BroadcastReaction);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  // Mark broadcast as viewed (read receipt)
  async markBroadcastViewed(broadcastId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // @ts-ignore - Edge function not in generated types yet
      const { error } = await supabase.rpc('mark_broadcast_viewed', {
        broadcast_uuid: broadcastId
      });

      return !error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error marking broadcast as viewed:', error);
      }
      return false;
    }
  },

  // Get read receipt count for a broadcast
  async getBroadcastReadCount(broadcastId: string): Promise<number> {
    try {
      // @ts-ignore - Edge function not in generated types yet
      const { data, error } = await supabase.rpc('get_broadcast_read_count', {
        broadcast_uuid: broadcastId
      });

      if (error) throw error;
      return Number(data || 0);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error getting read count:', error);
      }
      return 0;
    }
  },

  // Send push notification for high-priority broadcasts
  async sendPushNotification(broadcastId: string, tripId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get broadcast details
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcasts')
        .select('message, priority')
        .eq('id', broadcastId)
        .single();

      if (broadcastError || !broadcast) {
        throw new Error('Broadcast not found');
      }

      // Only send push for urgent/reminder priority
      if (broadcast.priority !== 'urgent' && broadcast.priority !== 'reminder') {
        return true; // Not an error, just not needed
      }

      // Get trip members
      const { data: members, error: membersError } = (await supabase
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', tripId)
        .eq('status', 'active')
        .neq('user_id', user.id)) as { data: { user_id: string }[] | null; error: any }; // Don't notify the sender

      if (membersError) {
        throw membersError;
      }

      if (!members || members.length === 0) {
        return true; // No members to notify
      }

      // Get push tokens for members
      const userIds = members.map(m => m.user_id);
      // Table not in generated types yet - temporary until types regenerated
      const { data: tokens, error: tokensError } = await supabase
        .from('push_tokens' as any)
        .select('token, platform')
        .in('user_id', userIds);

      if (tokensError) {
        if (import.meta.env.DEV) {
          console.warn('Failed to fetch push tokens:', tokensError);
        }
        return true; // Don't fail broadcast creation if push tokens unavailable
      }

      if (!tokens || tokens.length === 0) {
        return true; // No tokens available
      }

      // Send push notification via edge function
      const { error: pushError } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'send_push',
          userId: user.id,
          tokens: (tokens as any[]).map((t: any) => t.token),
          title: broadcast.priority === 'urgent' ? '🚨 Urgent Broadcast' : '📢 Broadcast',
          body: broadcast.message.substring(0, 100),
          data: {
            type: 'broadcast',
            broadcastId,
            tripId,
            url: `/trips/${tripId}/broadcasts`
          }
        }
      });

      if (pushError) {
        if (import.meta.env.DEV) {
          console.warn('Failed to send push notification:', pushError);
        }
        return true; // Don't fail broadcast creation if push fails
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error sending push notification:', error);
      }
      return false;
    }
  }
};