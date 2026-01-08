import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';

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
  };
}

interface UseTripAdminsProps {
  tripId: string;
  enabled?: boolean;
}

export const useTripAdmins = ({ tripId, enabled = true }: UseTripAdminsProps) => {
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
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

      // 🆕 DEMO MODE: Return current user as admin
      if (isDemoMode && user?.id) {
        setAdmins([{
          id: `mock-admin-${tripId}`,
          trip_id: tripId,
          user_id: user.id,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
          permissions: {
            can_manage_roles: true,
            can_manage_channels: true,
            can_designate_admins: true,
          },
          profile: {
            display_name: user.email?.split('@')[0] || 'Demo User',
            avatar_url: undefined,
          }
        }]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('trip_admins')
        .select('*')
        .eq('trip_id', tripId)
        .order('granted_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately (use public view for co-member data)
      const adminsWithProfiles = await Promise.all(
        (data || []).map(async (admin) => {
          const { data: profile } = await supabase
            .from('profiles_public')
            .select('display_name, avatar_url')
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
  }, [tripId, enabled, isDemoMode, user?.id, user?.email]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Subscribe to realtime updates (skip in demo mode)
  useEffect(() => {
    if (!enabled || !tripId || isDemoMode) return;

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
  }, [tripId, enabled, isDemoMode, fetchAdmins]);

  const promoteToAdmin = useCallback(async (targetUserId: string) => {
    setIsProcessing(true);
    
    try {
      // 🆕 DEMO MODE: Show success toast only
      if (isDemoMode) {
        toast.success('✅ User promoted to admin');
        return { success: true, message: 'User promoted' };
      }

      const { data, error } = await supabase.rpc('promote_to_admin' as any, {
        _trip_id: tripId,
        _target_user_id: targetUserId
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
  }, [tripId, fetchAdmins, isDemoMode]);

  const demoteFromAdmin = useCallback(async (targetUserId: string) => {
    setIsProcessing(true);
    
    try {
      // 🆕 DEMO MODE: Show success toast only
      if (isDemoMode) {
        toast.success('User demoted from admin');
        return { success: true, message: 'User demoted' };
      }

      const { data, error } = await supabase.rpc('demote_from_admin' as any, {
        _trip_id: tripId,
        _target_user_id: targetUserId
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
  }, [tripId, fetchAdmins, isDemoMode]);

  return {
    admins,
    isLoading,
    isProcessing,
    promoteToAdmin,
    demoteFromAdmin,
    refetch: fetchAdmins
  };
};
