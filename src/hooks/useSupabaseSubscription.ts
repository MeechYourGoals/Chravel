import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * HIGH PRIORITY FIX: Standardized subscription cleanup hook
 * Ensures all Supabase subscriptions are properly cleaned up to prevent memory leaks
 * 
 * @param setupSubscription - Function that sets up and returns a Supabase channel
 * @param dependencies - React dependencies array (same as useEffect)
 */
export function useSupabaseSubscription(
  setupSubscription: () => RealtimeChannel | null,
  dependencies: React.DependencyList
): void {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Cleanup previous subscription if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current).catch(error => {
        if (import.meta.env.DEV) {
          console.warn('[useSupabaseSubscription] Error removing previous channel:', error);
        }
      });
      channelRef.current = null;
    }

    // Set up new subscription
    const channel = setupSubscription();
    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(error => {
          if (import.meta.env.DEV) {
            console.warn('[useSupabaseSubscription] Error removing channel on cleanup:', error);
          }
        });
        channelRef.current = null;
      }
    };
  }, dependencies);
}
