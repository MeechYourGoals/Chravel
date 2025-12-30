/**
 * Event RSVP Hook
 * 
 * Manages RSVP/registration system for Events including:
 * - RSVP status tracking (going, maybe, not-going, not-answered)
 * - Capacity limit enforcement
 * - Waitlist management
 * 
 * Database: event_rsvps table (to be created in migration)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RSVPStatus } from '@/types/events';

export interface EventRSVP {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: RSVPStatus;
  rsvpedAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
  waitlistPosition?: number;
}

export interface EventCapacity {
  total: number;
  current: number;
  available: number;
  waitlistCount: number;
  isFull: boolean;
  isWaitlistEnabled: boolean;
}

/**
 * Hook for managing event RSVPs
 */
export const useEventRSVP = (eventId: string) => {
  const { user } = useAuth();
  const [rsvp, setRsvp] = useState<EventRSVP | null>(null);
  const [capacity, setCapacity] = useState<EventCapacity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load current user's RSVP
  const loadRSVP = useCallback(async () => {
    if (!user?.id || !eventId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get event capacity info
      const { data: eventData, error: eventError } = await supabase
        .from('trips')
        .select('capacity, registration_status')
        .eq('id', eventId)
        .eq('trip_type', 'event')
        .single();

      if (eventError) {
        console.error('Failed to load event:', eventError);
        setIsLoading(false);
        return;
      }

      // Get RSVP count
      const { count: rsvpCount } = await supabase
        .from('event_rsvps' as any)
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'going');

      // Get waitlist count
      const { count: waitlistCount } = await supabase
        .from('event_rsvps' as any)
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'waitlist');

      // Get current user's RSVP
      const { data: userRsvp, error: rsvpError } = await supabase
        .from('event_rsvps' as any)
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      if (rsvpError && rsvpError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Failed to load RSVP:', rsvpError);
      }

      const totalCapacity = (eventData as any)?.capacity || 0;
      const currentCount = rsvpCount || 0;
      const waitlist = waitlistCount || 0;

      setCapacity({
        total: totalCapacity,
        current: currentCount,
        available: Math.max(0, totalCapacity - currentCount),
        waitlistCount: waitlist,
        isFull: currentCount >= totalCapacity,
        isWaitlistEnabled: (eventData as any)?.registration_status === 'waitlist'
      });

      if (userRsvp) {
        setRsvp({
          id: (userRsvp as any).id,
          eventId: (userRsvp as any).event_id,
          userId: (userRsvp as any).user_id,
          userName: (userRsvp as any).user_name || user.email || 'Unknown',
          userEmail: (userRsvp as any).user_email || user.email || '',
          status: (userRsvp as any).status as RSVPStatus,
          rsvpedAt: (userRsvp as any).rsvped_at,
          checkedIn: (userRsvp as any).checked_in || false,
          checkedInAt: (userRsvp as any).checked_in_at,
          waitlistPosition: (userRsvp as any).waitlist_position
        });
      }
    } catch (error) {
      console.error('Error loading RSVP:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, eventId]);

  // Submit RSVP
  const submitRSVP = useCallback(async (status: RSVPStatus): Promise<boolean> => {
    if (!user?.id || !eventId) return false;

    try {
      setIsSubmitting(true);

      // Check capacity if status is 'going'
      if (status === 'going' && capacity?.isFull && !capacity.isWaitlistEnabled) {
        throw new Error('Event is at full capacity');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles_public')
        .select('display_name, first_name, last_name, email')
        .eq('user_id', user.id)
        .single();

      const derivedName =
        profile?.display_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
      const userName = derivedName || user.email || 'Unknown';
      const userEmail = profile?.email || user.email || '';

      // Determine waitlist position if needed
      let waitlistPosition: number | undefined;
      if (status === 'going' && capacity?.isFull && capacity.isWaitlistEnabled) {
        const { count } = await supabase
          .from('event_rsvps' as any)
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'waitlist');
        waitlistPosition = (count || 0) + 1;
      }

      // Upsert RSVP
      const { data, error } = await supabase
        .from('event_rsvps' as any)
        .upsert({
          event_id: eventId,
          user_id: user.id,
          user_name: userName,
          user_email: userEmail,
          status: status === 'going' && capacity?.isFull && capacity.isWaitlistEnabled ? 'waitlist' : status,
          rsvped_at: new Date().toISOString(),
          waitlist_position: waitlistPosition
        }, {
          onConflict: 'event_id,user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to submit RSVP:', error);
        return false;
      }

      // Reload RSVP and capacity
      await loadRSVP();
      return true;
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, eventId, capacity, loadRSVP]);

  useEffect(() => {
    loadRSVP();
  }, [loadRSVP]);

  return {
    rsvp,
    capacity,
    isLoading,
    isSubmitting,
    submitRSVP,
    refreshRSVP: loadRSVP
  };
};
