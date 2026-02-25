import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useJoinRequests } from './useJoinRequests';
import { ALWAYS_ON_EVENT_TABS } from '@/lib/eventTabs';

interface TripAdminData {
  privacy_mode: string | null;
  enabled_features: string[] | null;
  chat_mode: string | null;
  media_upload_mode: string | null;
}

interface MemberProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export type ChatMode = 'broadcasts' | 'admin_only' | 'everyone';
export type MediaUploadMode = 'admin_only' | 'everyone';

interface UseEventAdminProps {
  eventId: string;
  enabled?: boolean;
}

export const useEventAdmin = ({ eventId, enabled = true }: UseEventAdminProps) => {
  const [tripData, setTripData] = useState<TripAdminData | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    requests: joinRequests,
    isLoading: requestsLoading,
    isProcessing,
    approveRequest,
    rejectRequest,
    refetch: refetchRequests,
  } = useJoinRequests({ tripId: eventId, enabled });

  const fetchData = useCallback(async () => {
    if (!enabled || !eventId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const [tripResult, membersResult] = await Promise.all([
        supabase
          .from('trips')
          .select('privacy_mode, enabled_features, chat_mode, media_upload_mode')
          .eq('id', eventId)
          .maybeSingle(),
        supabase.from('trip_members').select('user_id').eq('trip_id', eventId),
      ]);

      if (tripResult.error) throw tripResult.error;

      setTripData(tripResult.data as TripAdminData);

      const memberUserIds = (membersResult.data || []).map((m: any) => m.user_id);
      if (memberUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('user_id, resolved_display_name, avatar_url, email')
          .in('user_id', memberUserIds);

        setMembers(
          (profiles || []).map((p: any) => ({
            user_id: p.user_id,
            display_name: p.resolved_display_name || p.email?.split('@')[0] || 'Member',
            avatar_url: p.avatar_url,
            email: p.email,
          })),
        );
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('[useEventAdmin] Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isPrivate = tripData?.privacy_mode === 'high';
  const chatMode: ChatMode = (tripData?.chat_mode as ChatMode) || 'broadcasts';
  const mediaUploadMode: MediaUploadMode =
    (tripData?.media_upload_mode as MediaUploadMode) || 'admin_only';

  const toggleVisibility = useCallback(async () => {
    if (!eventId || isSaving) return;

    const newMode = isPrivate ? 'standard' : 'high';
    setIsSaving(true);
    setTripData(prev => (prev ? { ...prev, privacy_mode: newMode } : prev));

    try {
      const { error } = await supabase
        .from('trips')
        .update({ privacy_mode: newMode })
        .eq('id', eventId);

      if (error) throw error;
      toast.success(newMode === 'high' ? 'Event set to Private' : 'Event set to Public');
    } catch (error) {
      setTripData(prev =>
        prev ? { ...prev, privacy_mode: isPrivate ? 'high' : 'standard' } : prev,
      );
      console.error('[useEventAdmin] toggleVisibility error:', error);
      toast.error('Failed to update visibility');
    } finally {
      setIsSaving(false);
    }
  }, [eventId, isPrivate, isSaving]);

  const toggleFeature = useCallback(
    async (featureId: string) => {
      if (!eventId || isSaving || ALWAYS_ON_EVENT_TABS.has(featureId as any)) return;

      const current = tripData?.enabled_features || [];
      const isEnabled = current.includes(featureId);
      const updated = isEnabled ? current.filter(f => f !== featureId) : [...current, featureId];

      ALWAYS_ON_EVENT_TABS.forEach(alwaysOnFeature => {
        if (alwaysOnFeature !== 'admin' && !updated.includes(alwaysOnFeature)) {
          updated.push(alwaysOnFeature);
        }
      });

      setIsSaving(true);
      setTripData(prev => (prev ? { ...prev, enabled_features: updated } : prev));

      try {
        const { error } = await supabase
          .from('trips')
          .update({ enabled_features: updated })
          .eq('id', eventId);

        if (error) throw error;
      } catch (error) {
        setTripData(prev => (prev ? { ...prev, enabled_features: current } : prev));
        console.error('[useEventAdmin] toggleFeature error:', error);
        toast.error('Failed to update tab setting');
      } finally {
        setIsSaving(false);
      }
    },
    [eventId, tripData?.enabled_features, isSaving],
  );

  const isFeatureEnabled = useCallback(
    (featureId: string) => {
      if (ALWAYS_ON_EVENT_TABS.has(featureId as any)) return true;
      return (tripData?.enabled_features || []).includes(featureId);
    },
    [tripData?.enabled_features],
  );

  const setChatMode = useCallback(
    async (mode: ChatMode) => {
      if (!eventId || isSaving) return;

      const prev = chatMode;
      setIsSaving(true);
      setTripData(p => (p ? { ...p, chat_mode: mode } : p));

      try {
        const { error } = await supabase
          .from('trips')
          .update({ chat_mode: mode } as any)
          .eq('id', eventId);

        if (error) throw error;
        toast.success('Chat permissions updated');
      } catch (error) {
        setTripData(p => (p ? { ...p, chat_mode: prev } : p));
        console.error('[useEventAdmin] setChatMode error:', error);
        toast.error('Failed to update chat permissions');
      } finally {
        setIsSaving(false);
      }
    },
    [eventId, chatMode, isSaving],
  );

  const setMediaUploadMode = useCallback(
    async (mode: MediaUploadMode) => {
      if (!eventId || isSaving) return;

      const prev = mediaUploadMode;
      setIsSaving(true);
      setTripData(p => (p ? { ...p, media_upload_mode: mode } : p));

      try {
        const { error } = await supabase
          .from('trips')
          .update({ media_upload_mode: mode } as any)
          .eq('id', eventId);

        if (error) throw error;
        toast.success('Media upload permissions updated');
      } catch (error) {
        setTripData(p => (p ? { ...p, media_upload_mode: prev } : p));
        console.error('[useEventAdmin] setMediaUploadMode error:', error);
        toast.error('Failed to update media permissions');
      } finally {
        setIsSaving(false);
      }
    },
    [eventId, mediaUploadMode, isSaving],
  );

  return {
    isPrivate,
    members,
    memberCount: members.length,
    joinRequests,
    isLoading: isLoading || requestsLoading,
    isSaving,
    isProcessing,
    chatMode,
    mediaUploadMode,
    toggleVisibility,
    toggleFeature,
    isFeatureEnabled,
    setChatMode,
    setMediaUploadMode,
    approveRequest,
    rejectRequest,
    refetch: fetchData,
    refetchRequests,
  };
};
