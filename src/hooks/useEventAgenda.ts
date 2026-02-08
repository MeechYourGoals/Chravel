import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';
import { eventsMockData } from '@/data/eventsMockData';
import type { EventAgendaItem } from '@/types/events';

interface UseEventAgendaOptions {
  eventId: string;
  initialSessions?: EventAgendaItem[];
  enabled?: boolean;
}

/**
 * Convert a time-only string ("HH:MM") to a full ISO timestamp by combining
 * it with a date string. Required because the DB columns `start_time` and
 * `end_time` are `timestamptz`, not plain `time`.
 */
function buildTimestamp(
  time: string | undefined | null,
  date: string | undefined | null,
): string | null {
  if (!time) return null;

  // Already a full timestamp — pass through
  if (time.includes('T') || time.length > 8) return time;

  // Use the provided session_date, or fall back to today
  const dateStr = date || new Date().toISOString().split('T')[0];
  const timeStr = time.length === 5 ? `${time}:00` : time; // "HH:MM" → "HH:MM:SS"
  return `${dateStr}T${timeStr}`;
}

/**
 * Extract the "HH:MM" portion from a value that may be a full ISO timestamp
 * (returned by the DB) or already a plain time string.
 */
function extractTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  // Already in HH:MM or HH:MM:SS format
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.substring(0, 5);

  // Full ISO timestamp — pull out the time component
  const isoTimeMatch = value.match(/T(\d{2}:\d{2})/);
  if (isoTimeMatch) return isoTimeMatch[1];

  // Fallback: try Date parsing (handles various Postgres formats)
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  } catch {
    // fall through
  }

  return undefined;
}

/**
 * Extract "YYYY-MM-DD" from a value that may be a full ISO timestamp or
 * already a date-only string.
 */
function extractDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // Full ISO timestamp — grab the date prefix
  const dateMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) return dateMatch[1];

  return undefined;
}

export function useEventAgenda({
  eventId,
  initialSessions = [],
  enabled = true,
}: UseEventAgendaOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const queryKey = ['event-agenda', eventId];

  // Fetch agenda sessions from Supabase
  const { data: sessions = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<EventAgendaItem[]> => {
      if (isDemoMode) {
        const demoData = eventsMockData[eventId];
        return demoData?.agenda || initialSessions;
      }

      const { data, error } = await supabase
        .from('event_agenda_items')
        .select('*')
        .eq('event_id', eventId)
        .order('session_date', { ascending: true, nullsFirst: false })
        .order('start_time', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Failed to fetch agenda:', error);
        return initialSessions;
      }

      return (data || []).map(row => ({
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        session_date: extractDate(row.session_date),
        start_time: extractTime(row.start_time),
        end_time: extractTime(row.end_time),
        location: row.location ?? undefined,
        track: row.track ?? undefined,
        speakers: row.speakers ?? undefined,
      }));
    },
    staleTime: 30_000,
    enabled,
  });

  // Add session
  const addSession = useMutation({
    mutationFn: async (session: Omit<EventAgendaItem, 'id'>) => {
      if (isDemoMode) {
        return { ...session, id: `demo-${Date.now()}` } as EventAgendaItem;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error } = await supabase
        .from('event_agenda_items')
        .insert({
          event_id: eventId,
          title: session.title,
          description: session.description || null,
          session_date: session.session_date || null,
          start_time: buildTimestamp(session.start_time, session.session_date),
          end_time: buildTimestamp(session.end_time, session.session_date),
          location: session.location || null,
          track: session.track || null,
          speakers: session.speakers || null,
          created_by: userId || null,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        description: data.description ?? undefined,
        session_date: extractDate(data.session_date),
        start_time: extractTime(data.start_time),
        end_time: extractTime(data.end_time),
        location: data.location ?? undefined,
        track: data.track ?? undefined,
        speakers: data.speakers ?? undefined,
      } as EventAgendaItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Session added' });
    },
    onError: (err: Error) => {
      console.error('Failed to add session:', err);
      toast({ title: 'Failed to add session', description: err.message, variant: 'destructive' });
    },
  });

  // Update session
  const updateSession = useMutation({
    mutationFn: async (session: EventAgendaItem) => {
      if (isDemoMode) return session;

      const { error } = await supabase
        .from('event_agenda_items')
        .update({
          title: session.title,
          description: session.description || null,
          session_date: session.session_date || null,
          start_time: buildTimestamp(session.start_time, session.session_date),
          end_time: buildTimestamp(session.end_time, session.session_date),
          location: session.location || null,
          track: session.track || null,
          speakers: session.speakers || null,
        })
        .eq('id', session.id);

      if (error) throw error;
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Session updated' });
    },
    onError: (err: Error) => {
      console.error('Failed to update session:', err);
      toast({
        title: 'Failed to update session',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Delete session
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (isDemoMode) return sessionId;

      const { error } = await supabase.from('event_agenda_items').delete().eq('id', sessionId);

      if (error) throw error;
      return sessionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Session removed' });
    },
    onError: (err: Error) => {
      console.error('Failed to delete session:', err);
      toast({
        title: 'Failed to delete session',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  return {
    sessions,
    isLoading,
    addSession: addSession.mutateAsync,
    updateSession: updateSession.mutateAsync,
    deleteSession: deleteSession.mutateAsync,
    isAdding: addSession.isPending,
    isUpdating: updateSession.isPending,
    isDeleting: deleteSession.isPending,
  };
}
