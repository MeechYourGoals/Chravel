import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
 *
 * === AUTH SAFETY ===
 * The hook is disabled (`enabled = false`) when userId is falsy, preventing
 * queries before auth hydration completes. This avoids the Trip Not Found /
 * auth desync regression pattern documented in DEBUG_PATTERNS.md.
 *
 * === ERROR HANDLING ===
 * On any Supabase error the hook defaults to permissive (canPost = true) so
 * that legitimate users are never locked out of an accessible chat. The
 * server-side RLS layer will still block unauthorized posts.
 */

type ChatMode = 'everyone' | 'admin_only' | 'broadcasts' | null;
type MediaUploadMode = 'everyone' | 'admin_only' | null;

interface TripChatModeResult {
  chatMode: ChatMode;
  mediaUploadMode: MediaUploadMode;
  userRole: string | null;
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

      // Fetch trip chat_mode and media_upload_mode
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('chat_mode, media_upload_mode, trip_type')
        .eq('id', tripId)
        .maybeSingle();

      if (cancelled) return;

      if (tripError || !tripData) {
        // On error or trip not found, default to permissive.
        // Server-side RLS is the authoritative enforcement.
        setChatMode(null);
        setMediaUploadMode(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      const mode = (tripData.chat_mode as ChatMode) ?? null;
      const uploadMode = (tripData.media_upload_mode as MediaUploadMode) ?? null;

      setChatMode(mode);
      setMediaUploadMode(uploadMode);

      // Fetch user's role in this trip
      const { data: memberData, error: memberError } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (memberError || !memberData) {
        // User may not be a member (or query failed). Default permissive.
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

  const canPost: boolean = (() => {
    if (isLoading) return false;
    if (!chatMode || chatMode === 'everyone') return true;
    if (chatMode === 'admin_only' || chatMode === 'broadcasts') return isAdmin;
    return true;
  })();

  const canUploadMedia: boolean = (() => {
    if (isLoading) return false;
    if (!mediaUploadMode || mediaUploadMode === 'everyone') return true;
    if (mediaUploadMode === 'admin_only') return isAdmin;
    return true;
  })();

  return {
    chatMode,
    mediaUploadMode,
    userRole,
    canPost,
    canUploadMedia,
    isLoading,
  };
}
