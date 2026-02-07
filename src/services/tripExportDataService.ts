/**
 * Trip Export Data Service
 * Fetches real trip data client-side for PDF export
 */

import { supabase } from '@/integrations/supabase/client';
import { ExportSection } from '@/types/tripExport';
import { proTripMockData } from '@/data/proTripMockData';
import { useDemoModeStore } from '@/store/demoModeStore';

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
    role?: string;
  }>;
  broadcasts?: Array<{
    message: string;
    priority: string;
    timestamp: string;
    sender: string;
    read_count: number;
  }>;
  attachments?: Array<{
    name: string;
    type: string;
    uploaded_at: string;
    uploaded_by?: string;
  }>;
  agenda?: Array<{
    title: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    track?: string;
    speakers?: string[];
  }>;
  lineup?: Array<{
    name: string;
    title?: string;
    company?: string;
    type?: string;
  }>;
}

export async function getExportData(
  tripId: string,
  sections: ExportSection[],
): Promise<ExportTripData> {
  const result: ExportTripData = {
    trip: { title: 'Trip' },
  };

  // Check if this is a demo mode Pro trip
  const isDemoMode = useDemoModeStore.getState().isDemoMode;
  const mockProTrip = proTripMockData[tripId];

  if (isDemoMode && mockProTrip) {
    // Demo mode: transform ProTripData to ExportTripData
    result.trip = {
      title: mockProTrip.title,
      destination: mockProTrip.location,
      dateRange: mockProTrip.dateRange,
      description: mockProTrip.description,
    };

    // Map Calendar from schedule
    if (sections.includes('calendar') && mockProTrip.schedule) {
      result.calendar = mockProTrip.schedule.map(s => ({
        title: s.title || 'Event',
        start_time: s.startTime || new Date().toISOString(),
        end_time: s.endTime,
        location: s.location,
        description: s.notes,
      }));
    }

    // Map Payments from settlement
    if (
      sections.includes('payments') &&
      mockProTrip.settlement &&
      mockProTrip.settlement.length > 0
    ) {
      result.payments = {
        items: mockProTrip.settlement.map(p => ({
          description: p.venue || 'Payment',
          amount: p.finalPayout || 0,
          currency: 'USD',
          split_count: 1,
          is_settled: p.status === 'paid',
          created_at: p.date,
        })),
        total: mockProTrip.settlement.reduce((sum, p) => sum + (p.finalPayout || 0), 0),
        currency: 'USD',
      };
    }

    // Map Tasks
    if (sections.includes('tasks') && mockProTrip.tasks) {
      result.tasks = mockProTrip.tasks.map(t => ({
        title: t.title,
        description: t.description,
        completed: t.completed,
        due_date: t.due_at,
        assigned_to: t.assigned_to,
      }));
    }

    // Map Polls
    if (sections.includes('polls') && mockProTrip.polls) {
      result.polls = mockProTrip.polls.map(p => ({
        question: p.question,
        options: p.options,
        total_votes: p.total_votes,
        status: p.status,
      }));
    }

    // Map Places from links
    if (sections.includes('places') && mockProTrip.links) {
      result.places = mockProTrip.links.map(link => ({
        name: link.title,
        url: link.url,
        description: link.description,
        votes: 0,
      }));
    }

    // Map Broadcasts (Pro only)
    if (sections.includes('broadcasts') && mockProTrip.broadcasts) {
      (result as any).broadcasts = mockProTrip.broadcasts.map(b => ({
        message: b.message,
        priority: b.priority,
        timestamp: b.timestamp,
        sender: 'Team Member',
        read_count: b.readBy?.length || 0,
      }));
    }

    // Map Roster
    if (sections.includes('roster') && mockProTrip.roster) {
      result.roster = mockProTrip.roster.map(r => ({
        name: r.name,
        role: r.role,
      }));
    }

    return result;
  }

  // Authenticated mode: fetch from Supabase
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
        dateRange:
          trip.start_date && trip.end_date
            ? `${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`
            : undefined,
        description: trip.description || undefined,
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
          currency: payments[0]?.currency || 'USD',
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

      result.tasks =
        tasks?.map(t => ({
          title: t.title,
          description: t.description || undefined,
          completed: t.completed,
        })) || [];
    }

    // Fetch places/links if requested
    if (sections.includes('places')) {
      const placesData: Array<{ name: string; url: string; description?: string; votes: number }> =
        [];

      // 1. Fetch Trip Basecamp from trips table
      const { data: tripBasecamp } = await supabase
        .from('trips')
        .select('basecamp_name, basecamp_address')
        .eq('id', tripId)
        .single();

      if (tripBasecamp?.basecamp_address) {
        placesData.push({
          name: `📍 Trip Base Camp: ${tripBasecamp.basecamp_name || 'Main Location'}`,
          url: `https://maps.google.com/?q=${encodeURIComponent(tripBasecamp.basecamp_address)}`,
          description: tripBasecamp.basecamp_address,
          votes: 0,
        });
      }

      // 2. Fetch Personal Basecamp for current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: personalBasecamp } = await supabase
          .from('trip_personal_basecamps')
          .select('name, address')
          .eq('trip_id', tripId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (personalBasecamp?.address) {
          placesData.push({
            name: `🏠 Personal Base Camp: ${personalBasecamp.name || 'My Location'}`,
            url: `https://maps.google.com/?q=${encodeURIComponent(personalBasecamp.address)}`,
            description: `${personalBasecamp.address} (Private)`,
            votes: 0,
          });
        }
      }

      // 3. Fetch Trip Links
      const { data: links } = await supabase
        .from('trip_links')
        .select('title, url, description, category, votes')
        .eq('trip_id', tripId)
        .order('votes', { ascending: false });

      if (links) {
        placesData.push(
          ...links.map(link => ({
            name: link.title,
            url: link.url,
            description: link.category
              ? `[${link.category}] ${link.description || ''}`
              : link.description || undefined,
            votes: link.votes || 0,
          })),
        );
      }

      result.places = placesData;
    }

    // Fetch roster if requested
    if (sections.includes('roster')) {
      const { data: members } = await supabase
        .from('trip_members')
        .select(
          `
          role,
          user_id
        `,
        )
        .eq('trip_id', tripId);

      const memberIds = (members || []).map(m => m.user_id);
      let profilesMap = new Map<string, any>();

      if (memberIds.length) {
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, resolved_display_name, avatar_url')
          .in('user_id', memberIds);

        profilesMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }

      result.roster =
        members?.map(m => {
          const profile = profilesMap.get(m.user_id);
          return {
            name: profile?.resolved_display_name || profile?.display_name || 'Unknown',
            role: m.role || 'member',
          };
        }) || [];
    }

    // Fetch broadcasts if requested
    if (sections.includes('broadcasts')) {
      const { data: broadcasts } = await supabase
        .from('broadcasts')
        .select(
          `
          message,
          priority,
          created_at,
          is_sent,
          created_by,
          profiles:created_by (
            display_name
          )
        `,
        )
        .eq('trip_id', tripId)
        .eq('is_sent', true)
        .order('created_at', { ascending: true });

      if (broadcasts && broadcasts.length > 0) {
        (result as any).broadcasts = broadcasts.map(b => ({
          message: b.message,
          priority: b.priority || 'fyi',
          timestamp: b.created_at,
          sender: (b.profiles as any)?.display_name || 'Team Member',
          read_count: 0,
        }));
      }
    }

    // Fetch attachments if requested
    if (sections.includes('attachments')) {
      const { data: files } = await supabase
        .from('trip_files')
        .select(
          `
          id,
          name,
          file_type,
          created_at,
          uploaded_by,
          profiles:uploaded_by (
            display_name
          )
        `,
        )
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      (result as any).attachments =
        files?.map(f => ({
          name: f.name,
          type: f.file_type,
          uploaded_at: f.created_at,
          uploaded_by: (f.profiles as any)?.display_name || 'Unknown',
        })) || [];
    }

    // Fetch agenda items if requested (event-specific)
    if (sections.includes('agenda')) {
      const { data: agendaItems } = await supabase
        .from('event_agenda_items')
        .select('title, start_time, end_time, location, track, speakers')
        .eq('event_id', tripId)
        .order('start_time', { ascending: true });

      result.agenda = agendaItems?.map(item => ({
        title: item.title,
        start_time: item.start_time || undefined,
        end_time: item.end_time || undefined,
        location: item.location || undefined,
        track: item.track || undefined,
        speakers: item.speakers || undefined,
      })) || [];
    }

    // Fetch lineup if requested (event-specific — derived from agenda speakers)
    if (sections.includes('lineup')) {
      const { data: agendaItems } = await supabase
        .from('event_agenda_items')
        .select('speakers, track')
        .eq('event_id', tripId);

      // Deduplicate speakers across all agenda items
      const speakerMap = new Map<string, { name: string; type?: string }>();
      (agendaItems || []).forEach(item => {
        (item.speakers || []).forEach((speaker: string) => {
          if (!speakerMap.has(speaker)) {
            speakerMap.set(speaker, {
              name: speaker,
              type: item.track || undefined,
            });
          }
        });
      });

      result.lineup = Array.from(speakerMap.values());
    }

    return result;
  } catch (error) {
    console.error('[Export Data Service] Error fetching trip data:', error);
    return result;
  }
}
