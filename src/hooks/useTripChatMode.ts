import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { canPostInMainChat, resolveEffectiveMainChatMode } from '@/lib/eventChatPermissions';

/**
 * UI-convenience hook that reads the trip's chat_mode / media_upload_mode and
 * the current user's trip_members role so components can conditionally render
 * the chat input, upload buttons, and mode banners.
 *
 * === SECURITY MODEL ===
 * This hook is NOT a security boundary. The authoritative enforcement layer is
 * the server-side RLS function `can_post_to_trip_chat()` defined in migration
 * 20260315000001_enforce_chat_mode_rls.sql. Even if this hook returns
 * incorrect values, the server will reject unauthorized INSERTs.
 */

type ChatMode = 'everyone' | 'admin_only' | 'broadcasts' | null;
type MediaUploadMode = 'everyone' | 'admin_only' | null;

interface TripChatModeResult {
  chatMode: ChatMode;
  effectiveChatMode: Exclude<ChatMode, null>;
  mediaUploadMode: MediaUploadMode;
  userRole: string | null;
  attendeeCount: number;
  canPost: boolean;
  canUploadMedia: boolean;
  isLoading: boolean;
}

export function useTripChatMode(
  tripId: string | undefined,
  userId: string | undefined,
): TripChatModeResult {
  const [chatMode, setChatMode] = useState<ChatMode>(null);
  const [mediaUploadMode, setMediaUploadMode] = useState<MediaUploadMode>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tripType, setTripType] = useState<string | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const enabled = Boolean(tripId && userId);

  useEffect(() => {
    if (!enabled || !tripId || !userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchChatMode = async (): Promise<void> => {
      setIsLoading(true);

      const [{ data: tripData, error: tripError }, { count: memberCount }] = await Promise.all([
        supabase
          .from('trips')
          .select('chat_mode, media_upload_mode, trip_type')
          .eq('id', tripId)
          .maybeSingle(),
        supabase
          .from('trip_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('trip_id', tripId),
      ]);

      if (cancelled) return;

      if (tripError || !tripData) {
        setChatMode(null);
        setMediaUploadMode(null);
        setUserRole(null);
        setTripType(null);
        setAttendeeCount(0);
        setIsLoading(false);
        return;
      }

      setChatMode((tripData.chat_mode as ChatMode) ?? null);
      setMediaUploadMode((tripData.media_upload_mode as MediaUploadMode) ?? null);
      setTripType(tripData.trip_type ?? null);
      setAttendeeCount(memberCount ?? 0);

      const { data: memberData, error: memberError } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (memberError || !memberData) {
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      setUserRole(memberData.role);
      setIsLoading(false);
    };

    fetchChatMode();

    return () => {
      cancelled = true;
    };
  }, [tripId, userId, enabled]);

  const isAdmin = userRole === 'admin' || userRole === 'organizer' || userRole === 'owner';
  const effectiveChatMode = resolveEffectiveMainChatMode(chatMode, tripType, attendeeCount);

  const canPost = canPostInMainChat({
    chatMode,
    tripType,
    attendeeCount,
    userRole,
    isLoading,
  });

  const canUploadMedia: boolean = (() => {
    if (isLoading) return false;
    if (!mediaUploadMode || mediaUploadMode === 'everyone') return true;
    // 'admin_only' media restriction is event-only; non-event trips allow all members to upload.
    // Guards against migration 20260214211051 which set DEFAULT 'admin_only' for all trips.
    if (mediaUploadMode === 'admin_only') {
      return tripType !== 'event' || isAdmin;
    }
    return true;
  })();

  return {
    chatMode,
    effectiveChatMode,
    mediaUploadMode,
    userRole,
    attendeeCount,
    canPost,
    canUploadMedia,
    isLoading,
  };
}
