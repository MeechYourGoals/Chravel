import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface TripPreferences {
  id: string;
  trip_id: string;
  dietary: string[];
  vibe: string[];
  accessibility: string[];
  business: string[];
  entertainment: string[];
  lifestyle: string[];
  budget_min: number;
  budget_max: number;
  time_preference: string;
  created_at: string;
  updated_at: string;
}

interface UpdatePreferencesRequest {
  dietary?: string[];
  vibe?: string[];
  accessibility?: string[];
  business?: string[];
  entertainment?: string[];
  lifestyle?: string[];
  budget_min?: number;
  budget_max?: number;
  time_preference?: string;
}

export const useTripPreferences = (tripId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch preferences from database
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['tripPreferences', tripId],
    queryFn: async (): Promise<TripPreferences | null> => {
      const { data, error } = await supabase
        .from('trip_preferences')
        .select('*')
        .eq('trip_id', tripId)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      // Transform JSON arrays to string arrays
      return {
        ...data,
        dietary: Array.isArray(data.dietary) ? data.dietary : [],
        vibe: Array.isArray(data.vibe) ? data.vibe : [],
        accessibility: Array.isArray(data.accessibility) ? data.accessibility : [],
        business: Array.isArray(data.business) ? data.business : [],
        entertainment: Array.isArray(data.entertainment) ? data.entertainment : [],
        lifestyle: Array.isArray(data.lifestyle) ? data.lifestyle : [],
      } as TripPreferences;
    },
    enabled: !!tripId,
  });

  // Create/update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: UpdatePreferencesRequest) => {
      const { data, error } = await supabase
        .from('trip_preferences')
        .upsert({
          trip_id: tripId,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripPreferences', tripId] });
      toast({
        title: 'Preferences updated',
        description: 'Your trip preferences have been saved.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
};
