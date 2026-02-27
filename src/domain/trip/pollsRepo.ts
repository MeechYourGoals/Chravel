import { supabase } from '@/integrations/supabase/client';

export interface TripPoll {
  id: string;
  trip_id: string;
  question: string;
  options: any; // JSON
  created_by: string;
  created_at: string;
  status: string; // 'open', 'closed'
  // Votes are usually fetched via RPC or join
}

/**
 * Polls Repository (TDAL)
 */
export const pollsRepo = {
  async getPolls(tripId: string): Promise<TripPoll[]> {
    const { data, error } = await supabase
      .from('trip_polls')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createPoll(poll: Omit<TripPoll, 'id' | 'created_at' | 'status'>): Promise<TripPoll> {
    const { data, error } = await supabase
      .from('trip_polls')
      .insert({
          ...poll,
          status: 'open'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async vote(pollId: string, optionId: string, userId: string): Promise<void> {
      const { error } = await supabase.rpc('vote_on_poll', {
          p_poll_id: pollId,
          p_option_id: optionId,
          p_user_id: userId
      });

      if (error) throw error;
  },

  async closePoll(pollId: string): Promise<void> {
      const { error } = await supabase
        .from('trip_polls')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', pollId);

      if (error) throw error;
  }
};
