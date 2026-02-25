import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import {
  DEFAULT_SYSTEM_MESSAGE_CATEGORIES,
  SystemMessageCategoryPrefs,
} from '@/utils/systemMessageCategory';

export interface SystemMessagePreferences {
  showSystemMessages: boolean;
  categories: SystemMessageCategoryPrefs;
}

const DEFAULT_PREFS: SystemMessagePreferences = {
  showSystemMessages: true,
  categories: DEFAULT_SYSTEM_MESSAGE_CATEGORIES,
};

/**
 * Hook for managing global user-level system message preferences
 */
export function useGlobalSystemMessagePreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['globalSystemMessagePrefs', user?.id],
    queryFn: async (): Promise<SystemMessagePreferences> => {
      if (!user?.id) return DEFAULT_PREFS;

      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .select('show_system_messages, system_message_categories')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) return DEFAULT_PREFS;

      return {
        showSystemMessages: data.show_system_messages ?? true,
        categories: {
          ...DEFAULT_SYSTEM_MESSAGE_CATEGORIES,
          ...(data.system_message_categories || {}),
        },
      };
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SystemMessagePreferences>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = { user_id: user.id };
      if (updates.showSystemMessages !== undefined) {
        updateData.show_system_messages = updates.showSystemMessages;
      }
      if (updates.categories !== undefined) {
        updateData.system_message_categories = updates.categories;
      }

      const { error } = await (supabase as any)
        .from('user_preferences')
        .upsert(updateData, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalSystemMessagePrefs', user?.id] });
      toast({
        title: 'Preferences saved',
        description: 'Your chat activity settings have been updated.',
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save preferences.', variant: 'destructive' });
    },
  });

  return {
    preferences: preferences ?? DEFAULT_PREFS,
    isLoading,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

/**
 * Hook for managing trip-specific system message preferences
 */
export function useTripSystemMessagePreferences(tripId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['tripSystemMessagePrefs', tripId, user?.id],
    queryFn: async (): Promise<{ hasOverride: boolean; preferences: SystemMessagePreferences }> => {
      if (!user?.id || !tripId) return { hasOverride: false, preferences: DEFAULT_PREFS };

      const { data, error } = await (supabase as any)
        .from('trip_member_preferences')
        .select('show_system_messages, system_message_categories')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) return { hasOverride: false, preferences: DEFAULT_PREFS };

      return {
        hasOverride: true,
        preferences: {
          showSystemMessages: data.show_system_messages ?? true,
          categories: {
            ...DEFAULT_SYSTEM_MESSAGE_CATEGORIES,
            ...(data.system_message_categories || {}),
          },
        },
      };
    },
    enabled: !!user?.id && !!tripId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SystemMessagePreferences>) => {
      if (!user?.id || !tripId) throw new Error('Missing user or trip');

      const updateData: Record<string, unknown> = { trip_id: tripId, user_id: user.id };
      if (updates.showSystemMessages !== undefined) {
        updateData.show_system_messages = updates.showSystemMessages;
      }
      if (updates.categories !== undefined) {
        updateData.system_message_categories = updates.categories;
      }

      const { error } = await (supabase as any)
        .from('trip_member_preferences')
        .upsert(updateData, { onConflict: 'trip_id,user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripSystemMessagePrefs', tripId, user?.id] });
      queryClient.invalidateQueries({
        queryKey: ['effectiveSystemMessagePrefs', tripId, user?.id],
      });
      toast({ title: 'Trip preferences saved' });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save trip preferences.',
        variant: 'destructive',
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !tripId) throw new Error('Missing user or trip');

      const { error } = await (supabase as any)
        .from('trip_member_preferences')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripSystemMessagePrefs', tripId, user?.id] });
      queryClient.invalidateQueries({
        queryKey: ['effectiveSystemMessagePrefs', tripId, user?.id],
      });
      toast({ title: 'Reset to defaults' });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reset preferences.',
        variant: 'destructive',
      });
    },
  });

  return {
    hasOverride: data?.hasOverride ?? false,
    preferences: data?.preferences ?? DEFAULT_PREFS,
    isLoading,
    updatePreferences: updateMutation.mutate,
    resetToGlobal: resetMutation.mutate,
    isUpdating: updateMutation.isPending,
    isResetting: resetMutation.isPending,
  };
}

/**
 * Hook to get effective preferences for a trip (resolves trip > global > defaults)
 */
export function useEffectiveSystemMessagePreferences(tripId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['effectiveSystemMessagePrefs', tripId, user?.id],
    queryFn: async (): Promise<SystemMessagePreferences> => {
      if (!user?.id || !tripId) return DEFAULT_PREFS;

      // 1. Check trip-specific preferences
      const { data: tripPrefs } = await (supabase as any)
        .from('trip_member_preferences')
        .select('show_system_messages, system_message_categories')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (tripPrefs) {
        return {
          showSystemMessages: tripPrefs.show_system_messages ?? true,
          categories: {
            ...DEFAULT_SYSTEM_MESSAGE_CATEGORIES,
            ...(tripPrefs.system_message_categories || {}),
          },
        };
      }

      // 2. Check global preferences
      const { data: globalPrefs } = await (supabase as any)
        .from('user_preferences')
        .select('show_system_messages, system_message_categories')
        .eq('user_id', user.id)
        .maybeSingle();

      if (globalPrefs) {
        return {
          showSystemMessages: globalPrefs.show_system_messages ?? true,
          categories: {
            ...DEFAULT_SYSTEM_MESSAGE_CATEGORIES,
            ...(globalPrefs.system_message_categories || {}),
          },
        };
      }

      return DEFAULT_PREFS;
    },
    enabled: !!user?.id && !!tripId,
    staleTime: 30000,
  });
}
