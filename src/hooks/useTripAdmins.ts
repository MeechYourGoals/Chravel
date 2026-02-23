import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';

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

async function fetchTripAdmins(
  tripId: string,
  isDemoMode: boolean,
  userId?: string,
): Promise<TripAdmin[]> {
  if (isDemoMode && userId) {
    return [
      {
        id: `mock-admin-${tripId}`,
        trip_id: tripId,
        user_id: userId,
        granted_by: userId,
        granted_at: new Date().toISOString(),
        permissions: {
          can_manage_roles: true,
          can_manage_channels: true,
          can_designate_admins: true,
        },
        profile: {
          display_name: 'Demo User',
          avatar_url: undefined,
        },
      },
    ];
  }

  const { data, error } = await supabase
    .from('trip_admins')
    .select('*')
    .eq('trip_id', tripId)
    .order('granted_at', { ascending: true });

  if (error) throw error;

  const adminsWithProfiles: TripAdmin[] = await Promise.all(
    (data || []).map(async admin => {
      const { data: profile } = await supabase
        .from('profiles_public')
        .select('display_name, resolved_display_name, avatar_url')
        .eq('user_id', admin.user_id)
        .single();

      const permissions = admin.permissions as Record<string, boolean> | null;

      return {
        id: admin.id,
        trip_id: admin.trip_id,
        user_id: admin.user_id,
        granted_by: admin.granted_by ?? undefined,
        granted_at: admin.granted_at ?? new Date().toISOString(),
        permissions: {
          can_manage_roles: permissions?.can_manage_roles ?? false,
          can_manage_channels: permissions?.can_manage_channels ?? false,
          can_designate_admins: permissions?.can_designate_admins ?? false,
        },
        profile: profile
          ? {
              display_name: profile.resolved_display_name || profile.display_name || 'User',
              avatar_url: profile.avatar_url ?? undefined,
            }
          : undefined,
      };
    }),
  );

  return adminsWithProfiles;
}

export const useTripAdmins = ({ tripId, enabled = true }: UseTripAdminsProps) => {
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: admins = [],
    isLoading,
    refetch,
    isError,
    error,
  } = useQuery({
    queryKey: tripKeys.tripAdmins(tripId),
    queryFn: () => fetchTripAdmins(tripId, isDemoMode, user?.id),
    enabled: enabled && !!tripId,
    staleTime: QUERY_CACHE_CONFIG.tripAdmins.staleTime,
    gcTime: QUERY_CACHE_CONFIG.tripAdmins.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.tripAdmins.refetchOnWindowFocus,
  });

  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to load admins');
    }
  }, [isError, error]);

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
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: tripKeys.tripAdmins(tripId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, enabled, isDemoMode, queryClient]);

  const [isProcessing, setIsProcessing] = useState(false);

  const promoteToAdmin = useCallback(
    async (targetUserId: string) => {
      if (isDemoMode) {
        toast.success('✅ User promoted to admin');
        return { success: true, message: 'User promoted' };
      }

      setIsProcessing(true);
      try {
        const { data, error } = await supabase.rpc('promote_to_admin' as const, {
          _trip_id: tripId,
          _target_user_id: targetUserId,
        });

        if (error) throw error;

        const result = data as { success: boolean; message: string };
        if (!result.success) throw new Error(result.message);

        toast.success('✅ User promoted to admin');
        await queryClient.invalidateQueries({ queryKey: tripKeys.tripAdmins(tripId) });
        return result;
      } finally {
        setIsProcessing(false);
      }
    },
    [tripId, isDemoMode, queryClient],
  );

  const demoteFromAdmin = useCallback(
    async (targetUserId: string) => {
      if (isDemoMode) {
        toast.success('User demoted from admin');
        return { success: true, message: 'User demoted' };
      }

      setIsProcessing(true);
      try {
        const { data, error } = await supabase.rpc('demote_from_admin' as const, {
          _trip_id: tripId,
          _target_user_id: targetUserId,
        });

        if (error) throw error;

        const result = data as { success: boolean; message: string };
        if (!result.success) throw new Error(result.message);

        toast.success('User demoted from admin');
        await queryClient.invalidateQueries({ queryKey: tripKeys.tripAdmins(tripId) });
        return result;
      } finally {
        setIsProcessing(false);
      }
    },
    [tripId, isDemoMode, queryClient],
  );

  return {
    admins,
    isLoading,
    isProcessing,
    promoteToAdmin,
    demoteFromAdmin,
    refetch,
  };
};
