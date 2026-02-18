import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';
import type { Speaker } from '@/types/events';

interface LineupMember {
  id: string;
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  avatar_url?: string;
  performer_type?: string;
}

interface UseEventLineupOptions {
  eventId: string;
  initialMembers?: Speaker[];
  enabled?: boolean;
}

function memberToSpeaker(m: LineupMember): Speaker {
  return {
    id: m.id,
    name: m.name,
    title: m.title || '',
    company: m.company || '',
    bio: m.bio || '',
    avatar: m.avatar_url || '',
    sessions: [],
    performerType: (m.performer_type as Speaker['performerType']) || 'speaker',
  };
}

export function useEventLineup({
  eventId,
  initialMembers = [],
  enabled = true,
}: UseEventLineupOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const queryKey = ['event-lineup', eventId];

  // Realtime: invalidate when lineup changes (collaborative editing)
  useEffect(() => {
    if (!enabled || !eventId || isDemoMode) return;

    const channel = supabase
      .channel(`event-lineup-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_lineup_members',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['event-lineup', eventId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, eventId, isDemoMode, queryClient]);

  // Fetch lineup from Supabase
  const { data: members = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Speaker[]> => {
      if (isDemoMode) return initialMembers;

      const { data, error } = await supabase
        .from('event_lineup_members')
        .select('*')
        .eq('event_id', eventId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Failed to fetch lineup:', error);
        return initialMembers;
      }

      return (data || []).map(memberToSpeaker);
    },
    staleTime: 30_000,
    enabled,
  });

  // Add member (with optimistic update)
  const addMember = useMutation({
    mutationFn: async (member: {
      name: string;
      title?: string;
      company?: string;
      bio?: string;
      performer_type?: string;
    }) => {
      if (isDemoMode) {
        return { ...member, id: `demo-${Date.now()}` };
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error } = await supabase
        .from('event_lineup_members')
        .insert({
          event_id: eventId,
          name: member.name,
          title: member.title || null,
          company: member.company || null,
          bio: member.bio || null,
          performer_type: member.performer_type || 'speaker',
          created_by: userId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async member => {
      if (isDemoMode) return;
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Speaker[]>(queryKey) ?? [];
      const optimistic: Speaker = {
        id: `opt-${Date.now()}`,
        name: member.name,
        title: member.title ?? '',
        company: member.company ?? '',
        bio: member.bio ?? '',
        avatar: '',
        sessions: [],
      };
      queryClient.setQueryData<Speaker[]>(queryKey, [...prev, optimistic]);
      return { prev };
    },
    onError: (err: Error, _member, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      console.error('Failed to add lineup member:', err);
      toast({
        title: 'Failed to add to line-up',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Added to line-up' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update member (with optimistic update)
  const updateMember = useMutation({
    mutationFn: async (member: {
      id: string;
      name: string;
      title?: string;
      company?: string;
      bio?: string;
    }) => {
      if (isDemoMode) return member;

      const { error } = await supabase
        .from('event_lineup_members')
        .update({
          name: member.name,
          title: member.title || null,
          company: member.company || null,
          bio: member.bio || null,
        })
        .eq('id', member.id);

      if (error) throw error;
      return member;
    },
    onMutate: async member => {
      if (isDemoMode) return;
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Speaker[]>(queryKey) ?? [];
      const next = prev.map(m =>
        m.id === member.id
          ? {
              ...m,
              name: member.name,
              title: member.title ?? m.title,
              company: member.company ?? m.company,
              bio: member.bio ?? m.bio,
            }
          : m,
      );
      queryClient.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (err: Error, _member, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      console.error('Failed to update lineup member:', err);
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Line-up member updated' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete member (with optimistic update)
  const deleteMember = useMutation({
    mutationFn: async (memberId: string) => {
      if (isDemoMode) return memberId;

      const { error } = await supabase.from('event_lineup_members').delete().eq('id', memberId);

      if (error) throw error;
      return memberId;
    },
    onMutate: async memberId => {
      if (isDemoMode) return;
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Speaker[]>(queryKey) ?? [];
      const next = prev.filter(m => m.id !== memberId);
      queryClient.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (err: Error, _memberId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      console.error('Failed to delete lineup member:', err);
      toast({ title: 'Failed to remove', description: err.message, variant: 'destructive' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Removed from line-up' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Batch add members from agenda speakers (with deduplication)
  // Uses fresh data from cache to avoid stale closure; handles unique violations
  const addMembersFromAgenda = useMutation({
    mutationFn: async (speakerNames: string[]) => {
      if (isDemoMode || speakerNames.length === 0) return;

      // Fetch fresh members from cache to avoid stale closure under concurrency
      const cached = queryClient.getQueryData<Speaker[]>(queryKey) ?? members;
      const existingNames = new Set(cached.map(m => m.name.toLowerCase()));
      const newNames = speakerNames.filter(n => !existingNames.has(n.toLowerCase()));
      if (newNames.length === 0) return;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const rows = newNames.map(name => ({
        event_id: eventId,
        name,
        performer_type: 'speaker' as const,
        created_by: userId || null,
      }));

      const { error } = await supabase.from('event_lineup_members').insert(rows);

      if (error) {
        // 23505 = unique_violation; ignore if concurrent insert created duplicate
        if (error.code === '23505') return;
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      console.error('Failed to auto-add lineup members:', err);
    },
  });
  // Batch smart import for lineup names (merge or replace)
  const importMembers = useMutation({
    mutationFn: async (payload: {
      names: string[];
      mode: 'merge' | 'replace';
      sourceUrl?: string;
    }): Promise<number> => {
      const normalized = Array.from(
        new Map(
          payload.names
            .filter(name => typeof name === 'string')
            .map(name => [name.trim().toLocaleLowerCase(), name.trim()] as [string, string])
            .filter(([key]) => key.length > 0),
        ).values(),
      ).sort((a: string, b: string) => a.localeCompare(b));

      if (isDemoMode || normalized.length === 0) {
        return normalized.length;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      let namesToInsert = normalized;

      if (payload.mode === 'replace') {
        const { error: deleteError } = await supabase
          .from('event_lineup_members')
          .delete()
          .eq('event_id', eventId);

        if (deleteError) throw deleteError;
      } else {
        const { data: existingRows, error: existingError } = await supabase
          .from('event_lineup_members')
          .select('name')
          .eq('event_id', eventId);

        if (existingError) throw existingError;

        type Row = { name: string };
        const existing = new Set(
          (existingRows || []).map((row: Row) => (row.name || '').toLocaleLowerCase()),
        );
        namesToInsert = normalized.filter(name => !existing.has(name.toLocaleLowerCase()));
      }

      if (namesToInsert.length === 0) return 0;

      const rows = namesToInsert.map(name => ({
        event_id: eventId,
        name,
        performer_type: 'speaker' as const,
        created_by: userId || null,
      }));

      const { error: insertError } = await supabase.from('event_lineup_members').insert(rows);
      if (insertError) throw insertError;

      return namesToInsert.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      console.error('Failed to smart import lineup members:', err);
    },
  });

  return {
    members,
    isLoading,
    addMember: addMember.mutateAsync,
    updateMember: updateMember.mutateAsync,
    deleteMember: deleteMember.mutateAsync,
    addMembersFromAgenda: addMembersFromAgenda.mutateAsync,
    importMembers: importMembers.mutateAsync,
  };
}
