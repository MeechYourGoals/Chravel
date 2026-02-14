import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildEventEnabledTabs } from '@/lib/eventTabs';

interface UseEventTabSettingsOptions {
  eventId: string;
  initialEnabledFeatures?: string[];
  enabled?: boolean;
}

export const useEventTabSettings = ({
  eventId,
  initialEnabledFeatures,
  enabled = true,
}: UseEventTabSettingsOptions) => {
  const [enabledFeatures, setEnabledFeatures] = useState<string[] | null | undefined>(
    initialEnabledFeatures,
  );

  useEffect(() => {
    if (!enabled || !eventId) return;

    let isMounted = true;

    const fetchTabSettings = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('enabled_features')
        .eq('id', eventId)
        .maybeSingle();

      if (error || !isMounted) return;
      setEnabledFeatures(data?.enabled_features ?? []);
    };

    fetchTabSettings();

    const channel = supabase
      .channel(`event-tab-settings-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${eventId}`,
        },
        payload => {
          const nextEnabled =
            (payload.new as { enabled_features?: string[] })?.enabled_features ?? [];
          setEnabledFeatures(nextEnabled);
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [enabled, eventId]);

  const enabledTabs = useMemo(() => buildEventEnabledTabs(enabledFeatures), [enabledFeatures]);

  return {
    enabledFeatures,
    enabledTabs,
  };
};
