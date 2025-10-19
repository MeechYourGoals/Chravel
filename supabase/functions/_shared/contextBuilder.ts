import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

export interface ComprehensiveTripContext {
  tripMetadata: {
    id: string;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    type: 'consumer' | 'pro' | 'event';
  };
  collaborators: Array<{
    id: string;
    name: string;
    role: string;
    email?: string;
  }>;
  messages: Array<{
    id: string;
    content: string;
    authorName: string;
    timestamp: string;
    type: 'message' | 'broadcast';
  }>;
  calendar: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    description?: string;
  }>;
  tasks: Array<{
    id: string;
    content: string;
    assignee?: string;
    dueDate?: string;
    isComplete: boolean;
  }>;
  payments: Array<{
    id: string;
    description: string;
    amount: number;
    paidBy: string;
    participants: string[];
    isSettled: boolean;
  }>;
  polls: Array<{
    id: string;
    question: string;
    options: Array<{ text: string; votes: number }>;
    status: 'active' | 'closed';
  }>;
  places: {
    basecamp?: {
      name: string;
      address: string;
      lat?: number;
      lng?: number;
    };
    savedPlaces: Array<{
      name: string;
      address: string;
      category: string;
    }>;
  };
  media: {
    files: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
      uploadedBy: string;
      uploadedAt: string;
    }>;
    links: Array<{
      id: string;
      url: string;
      title: string;
      category: string;
      addedBy: string;
    }>;
  };
}

export class TripContextBuilder {
  static async buildContext(tripId: string): Promise<ComprehensiveTripContext> {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    try {
      // Parallel fetch all data sources
      const [
        tripMetadata,
        collaborators,
        messages,
        calendar,
        tasks,
        payments,
        polls,
        places,
        files,
        links
      ] = await Promise.all([
        this.fetchTripMetadata(supabase, tripId),
        this.fetchCollaborators(supabase, tripId),
        this.fetchMessages(supabase, tripId),
        this.fetchCalendar(supabase, tripId),
        this.fetchTasks(supabase, tripId),
        this.fetchPayments(supabase, tripId),
        this.fetchPolls(supabase, tripId),
        this.fetchPlaces(supabase, tripId),
        this.fetchFiles(supabase, tripId),
        this.fetchLinks(supabase, tripId)
      ]);

      return {
        tripMetadata,
        collaborators,
        messages,
        calendar,
        tasks,
        payments,
        polls,
        places,
        media: { files, links }
      };
    } catch (error) {
      console.error('Error building trip context:', error);
      throw new Error('Failed to build comprehensive trip context');
    }
  }

  private static async fetchTripMetadata(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, name, destination, start_date, end_date, trip_type')
        .eq('id', tripId)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        destination: data.destination,
        startDate: data.start_date,
        endDate: data.end_date,
        type: data.trip_type || 'consumer'
      };
    } catch (error) {
      console.error('Error fetching trip metadata:', error);
      return {
        id: tripId,
        name: 'Unknown Trip',
        destination: 'Unknown',
        startDate: '',
        endDate: '',
        type: 'consumer' as const
      };
    }
  }

  private static async fetchCollaborators(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          user_id,
          role,
          profiles:user_id (full_name, email)
        `)
        .eq('trip_id', tripId);

      if (error) throw error;

      return data?.map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.full_name || 'Unknown',
        role: m.role || 'participant',
        email: m.profiles?.email
      })) || [];
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      return [];
    }
  }

  private static async fetchMessages(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_chat_messages')
        .select('id, content, author_name, created_at, message_type')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data?.map((m: any) => ({
        id: m.id,
        content: m.content,
        authorName: m.author_name,
        timestamp: m.created_at,
        type: m.message_type === 'broadcast' ? 'broadcast' : 'message'
      })).reverse() || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  private static async fetchCalendar(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_events')
        .select('id, title, start_time, end_time, location, description')
        .eq('trip_id', tripId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data?.map((e: any) => ({
        id: e.id,
        title: e.title,
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        description: e.description
      })) || [];
    } catch (error) {
      console.error('Error fetching calendar:', error);
      return [];
    }
  }

  private static async fetchTasks(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_tasks')
        .select('id, content, assignee_id, due_date, is_complete, profiles:assignee_id(full_name)')
        .eq('trip_id', tripId);

      if (error) throw error;

      return data?.map((t: any) => ({
        id: t.id,
        content: t.content,
        assignee: t.profiles?.full_name,
        dueDate: t.due_date,
        isComplete: t.is_complete
      })) || [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  private static async fetchPayments(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_payment_messages')
        .select('id, description, amount, created_by, split_participants, is_settled, profiles:created_by(full_name)')
        .eq('trip_id', tripId);

      if (error) throw error;

      return data?.map((p: any) => ({
        id: p.id,
        description: p.description,
        amount: p.amount,
        paidBy: p.profiles?.full_name || 'Unknown',
        participants: p.split_participants as string[],
        isSettled: p.is_settled
      })) || [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  }

  private static async fetchPolls(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_polls')
        .select('id, question, options, status')
        .eq('trip_id', tripId);

      if (error) throw error;

      return data?.map((p: any) => ({
        id: p.id,
        question: p.question,
        options: p.options as Array<{ text: string; votes: number }>,
        status: p.status as 'active' | 'closed'
      })) || [];
    } catch (error) {
      console.error('Error fetching polls:', error);
      return [];
    }
  }

  private static async fetchPlaces(supabase: any, tripId: string) {
    try {
      const { data: trip } = await supabase
        .from('trips')
        .select('basecamp_name, basecamp_address')
        .eq('id', tripId)
        .single();

      const { data: places } = await supabase
        .from('trip_places')
        .select('name, address, category, lat, lng')
        .eq('trip_id', tripId);

      return {
        basecamp: trip?.basecamp_name ? {
          name: trip.basecamp_name,
          address: trip.basecamp_address,
          lat: places?.find((p: any) => p.name === trip.basecamp_name)?.lat,
          lng: places?.find((p: any) => p.name === trip.basecamp_name)?.lng
        } : undefined,
        savedPlaces: places?.map((p: any) => ({
          name: p.name,
          address: p.address,
          category: p.category
        })) || []
      };
    } catch (error) {
      console.error('Error fetching places:', error);
      return {
        basecamp: undefined,
        savedPlaces: []
      };
    }
  }

  private static async fetchFiles(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_files')
        .select('id, file_name, file_type, file_url, uploaded_by, created_at, profiles:uploaded_by(full_name)')
        .eq('trip_id', tripId);

      if (error) throw error;

      return data?.map((f: any) => ({
        id: f.id,
        name: f.file_name,
        type: f.file_type,
        url: f.file_url,
        uploadedBy: f.profiles?.full_name || 'Unknown',
        uploadedAt: f.created_at
      })) || [];
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  }

  private static async fetchLinks(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_links')
        .select('id, url, title, category, added_by, profiles:added_by(full_name)')
        .eq('trip_id', tripId);

      if (error) throw error;

      return data?.map((l: any) => ({
        id: l.id,
        url: l.url,
        title: l.title,
        category: l.category,
        addedBy: l.profiles?.full_name || 'Unknown'
      })) || [];
    } catch (error) {
      console.error('Error fetching links:', error);
      return [];
    }
  }
}
