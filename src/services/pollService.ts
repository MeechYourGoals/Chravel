/**
 * Poll Service - Authenticated Mode
 * 
 * Provides poll CRUD operations for authenticated users.
 * Wraps pollStorageService and useTripPolls hook for easier consumption.
 * 
 * PHASE 2: Collaboration Features
 */

import { supabase } from '@/integrations/supabase/client';
import { pollStorageService } from './pollStorageService';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  trip_id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'closed';
}

export interface CreatePollRequest {
  question: string;
  options: string[];
}

export const pollService = {
  /**
   * Get all polls for a trip (authenticated mode)
   */
  async getPolls(tripId: string, isDemoMode: boolean = false): Promise<Poll[]> {
    if (isDemoMode) {
      // Demo mode uses pollStorageService directly
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('trip_polls')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database rows to Poll type
      return (data || []).map(item => ({
        id: item.id,
        trip_id: item.trip_id,
        question: item.question,
        options: item.options as unknown as PollOption[],
        total_votes: item.total_votes,
        created_by: item.created_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        status: item.status as 'active' | 'closed'
      }));
    } catch (error) {
      console.error('[pollService] Error fetching polls:', error);
      throw error;
    }
  },

  /**
   * Create a new poll (authenticated mode)
   */
  async createPoll(
    tripId: string,
    pollData: CreatePollRequest,
    isDemoMode: boolean = false
  ): Promise<Poll> {
    if (isDemoMode) {
      // Demo mode uses pollStorageService
      const result = await pollStorageService.createPoll(tripId, pollData);
      return {
        id: result.id,
        trip_id: result.trip_id,
        question: result.question,
        options: result.options,
        total_votes: result.total_votes,
        created_by: result.created_by,
        created_at: result.created_at,
        updated_at: result.updated_at,
        status: result.status
      };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Format options for database
      const formattedOptions = pollData.options.map((text, index) => ({
        id: `opt-${index}`,
        text,
        votes: 0
      }));

      const { data, error } = await supabase
        .from('trip_polls')
        .insert({
          trip_id: tripId,
          question: pollData.question,
          options: formattedOptions as any,
          total_votes: 0,
          created_by: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        trip_id: data.trip_id,
        question: data.question,
        options: data.options as unknown as PollOption[],
        total_votes: data.total_votes,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
        status: data.status as 'active' | 'closed'
      };
    } catch (error) {
      console.error('[pollService] Error creating poll:', error);
      throw error;
    }
  },

  /**
   * Vote on a poll option
   */
  async vote(
    tripId: string,
    pollId: string, 
    optionId: string,
    isDemoMode: boolean = false
  ): Promise<Poll> {
    if (isDemoMode) {
      // Demo mode uses localStorage with userId parameter
      const result = await pollStorageService.voteOnPoll(tripId, pollId, optionId, 'demo-user');
      if (!result) throw new Error('Poll not found');
      
      return {
        id: result.id,
        trip_id: result.trip_id,
        question: result.question,
        options: result.options,
        total_votes: result.total_votes,
        created_by: result.created_by,
        created_at: result.created_at,
        updated_at: result.updated_at,
        status: result.status
      };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current poll
      const { data: poll, error: fetchError } = await supabase
        .from('trip_polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (fetchError || !poll) throw fetchError || new Error('Poll not found');

      // Update vote count for the selected option
      const currentOptions = poll.options as unknown as PollOption[];
      const updatedOptions = currentOptions.map(opt => {
        if (opt.id === optionId) {
          return { ...opt, votes: opt.votes + 1 };
        }
        return opt;
      });

      // Update poll in database
      const { data: updatedPoll, error: updateError } = await supabase
        .from('trip_polls')
        .update({
          options: updatedOptions as any,
          total_votes: poll.total_votes + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', pollId)
        .select()
        .single();

      if (updateError) throw updateError;
      
      return {
        id: updatedPoll.id,
        trip_id: updatedPoll.trip_id,
        question: updatedPoll.question,
        options: updatedPoll.options as unknown as PollOption[],
        total_votes: updatedPoll.total_votes,
        created_by: updatedPoll.created_by,
        created_at: updatedPoll.created_at,
        updated_at: updatedPoll.updated_at,
        status: updatedPoll.status as 'active' | 'closed'
      };
    } catch (error) {
      console.error('[pollService] Error voting on poll:', error);
      throw error;
    }
  },

  /**
   * Close a poll (prevent further voting)
   */
  async closePoll(pollId: string): Promise<Poll> {
    try {
      const { data, error } = await supabase
        .from('trip_polls')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', pollId)
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        trip_id: data.trip_id,
        question: data.question,
        options: data.options as unknown as PollOption[],
        total_votes: data.total_votes,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
        status: data.status as 'active' | 'closed'
      };
    } catch (error) {
      console.error('[pollService] Error closing poll:', error);
      throw error;
    }
  },

  /**
   * Delete a poll (authenticated mode)
   */
  async deletePoll(pollId: string, isDemoMode: boolean = false): Promise<void> {
    if (isDemoMode) {
      throw new Error('Delete not supported in demo mode');
    }

    try {
      const { error } = await supabase
        .from('trip_polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;
    } catch (error) {
      console.error('[pollService] Error deleting poll:', error);
      throw error;
    }
  },

  /**
   * Get poll results with vote percentages
   */
  getPollResults(poll: Poll): Array<PollOption & { percentage: number }> {
    return (poll.options as PollOption[]).map(option => ({
      ...option,
      percentage: poll.total_votes > 0 
        ? Math.round((option.votes / poll.total_votes) * 100)
        : 0
    }));
  }
};
