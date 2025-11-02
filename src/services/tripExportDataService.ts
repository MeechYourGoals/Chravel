/**
 * Trip Export Data Service
 * Fetches real trip data client-side for PDF export
 */

import { supabase } from '@/integrations/supabase/client';
import { ExportSection } from '@/types/tripExport';

export interface ExportTripData {
  trip: {
    title: string;
    destination?: string;
    dateRange?: string;
    description?: string;
  };
  calendar?: Array<{
    title: string;
    start_time: string;
    end_time?: string;
    location?: string;
    description?: string;
  }>;
  payments?: {
    items: Array<{
      description: string;
      amount: number;
      currency: string;
      split_count: number;
      is_settled: boolean;
      created_at: string;
    }>;
    total: number;
    currency: string;
  };
  polls?: Array<{
    question: string;
    options: any;
    total_votes: number;
    status: string;
  }>;
  tasks?: Array<{
    title: string;
    description?: string;
    completed: boolean;
    due_date?: string;
    assigned_to?: string;
  }>;
  places?: Array<{
    name: string;
    url: string;
    description?: string;
    votes: number;
  }>;
  roster?: Array<{
    name: string;
    email?: string;
    role?: string;
    avatar_url?: string;
  }>;
}

export async function getExportData(
  tripId: string,
  sections: ExportSection[]
): Promise<ExportTripData> {
  const result: ExportTripData = {
    trip: { title: 'Trip' }
  };

  try {
    // Fetch trip basic info
    const { data: trip } = await supabase
      .from('trips')
      .select('name, destination, start_date, end_date, description')
      .eq('id', tripId)
      .single();

    if (trip) {
      result.trip = {
        title: trip.name || 'Trip',
        destination: trip.destination || undefined,
        dateRange: trip.start_date && trip.end_date 
          ? `${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`
          : undefined,
        description: trip.description || undefined
      };
    }

    // Fetch calendar events if requested
    if (sections.includes('calendar')) {
      const { data: events } = await supabase
        .from('trip_events')
        .select('title, start_time, end_time, location, description')
        .eq('trip_id', tripId)
        .order('start_time', { ascending: true });

      result.calendar = events || [];
    }

    // Fetch payments if requested
    if (sections.includes('payments')) {
      const { data: payments } = await supabase
        .from('trip_payment_messages')
        .select('description, amount, currency, split_count, is_settled, created_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (payments && payments.length > 0) {
        const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        result.payments = {
          items: payments,
          total,
          currency: payments[0]?.currency || 'USD'
        };
      }
    }

    // Fetch polls if requested
    if (sections.includes('polls')) {
      const { data: polls } = await supabase
        .from('trip_polls')
        .select('question, options, total_votes, status')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      result.polls = polls || [];
    }

    // Fetch tasks if requested
    if (sections.includes('tasks')) {
      const { data: tasks } = await supabase
        .from('trip_tasks')
        .select('title, description, completed')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      result.tasks = tasks?.map(t => ({
        title: t.title,
        description: t.description || undefined,
        completed: t.completed
      })) || [];
    }

    // Fetch places/links if requested
    if (sections.includes('places')) {
      const { data: links } = await supabase
        .from('trip_links')
        .select('title, url, description, votes')
        .eq('trip_id', tripId)
        .order('votes', { ascending: false });

      result.places = links?.map(link => ({
        name: link.title,
        url: link.url,
        description: link.description || undefined,
        votes: link.votes || 0
      })) || [];
    }

    // Fetch roster if requested
    if (sections.includes('roster')) {
      const { data: members } = await supabase
        .from('trip_members')
        .select(`
          role,
          profiles:user_id (
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('trip_id', tripId);

      result.roster = members?.map(m => ({
        name: (m.profiles as any)?.display_name || 'Unknown',
        email: (m.profiles as any)?.email,
        role: m.role || 'member',
        avatar_url: (m.profiles as any)?.avatar_url
      })) || [];
    }

    return result;
  } catch (error) {
    console.error('[Export Data Service] Error fetching trip data:', error);
    return result;
  }
}
