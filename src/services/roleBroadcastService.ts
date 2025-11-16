import { supabase } from '../integrations/supabase/client';
import { ProParticipant } from '../types/pro';

export interface RoleBroadcast {
  id: string;
  tripId: string;
  targetRoles: string[];
  message: string;
  priority: 'normal' | 'urgent';
  sentBy: string;
  sentAt: string;
  recipientCount: number;
}

class RoleBroadcastService {
  /**
   * Send announcement to all members with a specific role
   */
  async sendToRole(
    tripId: string,
    role: string,
    message: string,
    priority: 'normal' | 'urgent' = 'normal'
  ): Promise<boolean> {
    return this.sendToMultipleRoles(tripId, [role], message, priority);
  }

  /**
   * Send announcement to multiple roles
   */
  async sendToMultipleRoles(
    tripId: string,
    roles: string[],
    message: string,
    priority: 'normal' | 'urgent' = 'normal'
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Insert message into trip_messages with role targeting
      const { data, error } = await supabase
        .from('trip_chat_messages' as any)
        .insert({
          trip_id: tripId,
          sender_id: user.id,
          message: message,
          message_type: 'text',
          metadata: {
            target_roles: roles,
            is_role_broadcast: true,
            priority: priority
          }
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Trigger push notifications to role members

      return true;
    } catch (error) {
      console.error('Failed to send role broadcast:', error);
      return false;
    }
  }

  /**
   * Get count of recipients for given roles
   */
  getRecipientCount(roster: ProParticipant[], roles: string[]): number {
    return roster.filter(member => roles.includes(member.role)).length;
  }

  /**
   * Get members by role
   */
  getMembersByRole(roster: ProParticipant[], role: string): ProParticipant[] {
    return roster.filter(member => member.role === role);
  }

  /**
   * Get members by multiple roles
   */
  getMembersByRoles(roster: ProParticipant[], roles: string[]): ProParticipant[] {
    return roster.filter(member => roles.includes(member.role));
  }
}

export const roleBroadcastService = new RoleBroadcastService();

