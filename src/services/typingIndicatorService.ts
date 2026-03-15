/**
 * Typing Indicators Service
 * Uses Supabase Presence API to track who is currently typing
 */
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

/**
 * Track typing status for a user in a trip chat
 */
export class TypingIndicatorService {
  private channel: RealtimeChannel | null = null;
  private tripId: string;
  private userId: string;
  private userName: string;
  private typingTimeout: NodeJS.Timeout | null = null;
  private isTyping = false;
  /** Timestamp of last presence track() call — used for 300ms throttle. */
  private lastTrackTimestamp = 0;
  private static readonly TRACK_THROTTLE_MS = 300;

  constructor(tripId: string, userId: string, userName: string) {
    this.tripId = tripId;
    this.userId = userId;
    this.userName = userName;
  }

  /**
   * Initialize presence channel and track current user
   */
  async initialize(onTypingUpdate: (users: TypingUser[]) => void): Promise<void> {
    this.channel = supabase.channel(`typing:${this.tripId}`, {
      config: {
        presence: {
          key: this.userId,
        },
      },
    });

    // Track presence
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState();
        const typingUsers = this.extractTypingUsers(state || {});
        onTypingUpdate(typingUsers);
      })
      .on('presence', { event: 'join' }, ({ key: _key, newPresences: _newPresences }) => {
        const typingUsers = this.extractTypingUsers(this.channel?.presenceState() || {});
        onTypingUpdate(typingUsers);
      })
      .on('presence', { event: 'leave' }, ({ key: _key, leftPresences: _leftPresences }) => {
        const typingUsers = this.extractTypingUsers(this.channel?.presenceState() || {});
        onTypingUpdate(typingUsers);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await this.channel?.track({
            userId: this.userId,
            userName: this.userName,
            typing: false,
            timestamp: Date.now(),
          });
        }
      });
  }

  /**
   * Signal that user is typing.
   * Throttled to at most one presence track() call per 300ms to reduce
   * excessive Realtime events during rapid keystroke sequences.
   */
  async startTyping(): Promise<void> {
    const now = Date.now();

    // Always reset the auto-stop timer on every keystroke
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 3000);

    // Throttle: skip the track() call if we already sent one recently
    if (this.isTyping && now - this.lastTrackTimestamp < TypingIndicatorService.TRACK_THROTTLE_MS) {
      return;
    }

    this.isTyping = true;
    this.lastTrackTimestamp = now;
    await this.channel?.track({
      userId: this.userId,
      userName: this.userName,
      typing: true,
      timestamp: now,
    });
  }

  /**
   * Signal that user stopped typing
   */
  async stopTyping(): Promise<void> {
    if (!this.isTyping) return;

    this.isTyping = false;
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    await this.channel?.track({
      userId: this.userId,
      userName: this.userName,
      typing: false,
      timestamp: Date.now(),
    });
  }

  /**
   * Extract currently typing users from presence state
   */
  private extractTypingUsers(state: Record<string, any[]>): TypingUser[] {
    const typingUsers: TypingUser[] = [];
    const now = Date.now();
    const TYPING_TIMEOUT = 5000; // 5 seconds

    Object.values(state).forEach(presences => {
      presences.forEach((presence: any) => {
        if (
          presence.typing === true &&
          presence.userId !== this.userId &&
          now - presence.timestamp < TYPING_TIMEOUT
        ) {
          typingUsers.push({
            userId: presence.userId,
            userName: presence.userName || 'Someone',
            timestamp: presence.timestamp,
          });
        }
      });
    });

    return typingUsers;
  }

  /**
   * Cleanup and unsubscribe
   */
  async cleanup(): Promise<void> {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    await this.stopTyping();
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
