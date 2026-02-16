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
        session_date: row.session_date ?? undefined,
        start_time: row.start_time ?? undefined,
        end_time: row.end_time ?? undefined,
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
          start_time: session.start_time || null,
          end_time: session.end_time || null,
          location: session.location || null,
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
        session_date: data.session_date ?? undefined,
        start_time: data.start_time ?? undefined,
        end_time: data.end_time ?? undefined,
        location: data.location ?? undefined,
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
          start_time: session.start_time || null,
          end_time: session.end_time || null,
          location: session.location || null,
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
