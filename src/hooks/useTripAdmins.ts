import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TripAdmin {
  id: string;
  trip_id: string;
  user_id: string;
  granted_by?: string;
  granted_at: string;
  permissions: {
    can_manage_roles: boolean;
    can_manage_channels: boolean;
    can_designate_admins: boolean;
  };
  profile?: {
    display_name: string;
    avatar_url?: string;
    email?: string;
  };
}

interface UseTripAdminsProps {
  tripId: string;
  enabled?: boolean;
}

export const useTripAdmins = ({ tripId, enabled = true }: UseTripAdminsProps) => {
  const [admins, setAdmins] = useState<TripAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchAdmins = useCallback(async () => {
    if (!enabled || !tripId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('trip_admins')
        .select('*')
        .eq('trip_id', tripId)
        .order('granted_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      const adminsWithProfiles = await Promise.all(
        (data || []).map(async (admin) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, email')
            .eq('user_id', admin.user_id)
            .single();

          return {
            ...admin,
            profile: profile || undefined
          };
        })
      );

      setAdmins(adminsWithProfiles as TripAdmin[]);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!enabled || !tripId) return;

    const channel = supabase
      .channel(`trip_admins:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_admins',
          filter: `trip_id=eq.${tripId}`
        },
        () => {
          fetchAdmins();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, enabled, fetchAdmins]);

  const promoteToAdmin = useCallback(async (userId: string) => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.rpc('promote_to_admin' as any, {
        trip_id: tripId,
        target_user: userId
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('✅ User promoted to admin');
      await fetchAdmins();
      
      return result;
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to promote user');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [tripId, fetchAdmins]);

  const demoteFromAdmin = useCallback(async (userId: string) => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.rpc('demote_from_admin' as any, {
        trip_id: tripId,
        target_user: userId
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('User demoted from admin');
      await fetchAdmins();
      
      return result;
    } catch (error) {
      console.error('Error demoting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to demote user');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [tripId, fetchAdmins]);

  return {
    admins,
    isLoading,
    isProcessing,
    promoteToAdmin,
    demoteFromAdmin,
    refetch: fetchAdmins
  };
};
