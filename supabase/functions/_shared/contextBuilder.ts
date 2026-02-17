import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

export interface UserPreferences {
  dietary?: string[];
  vibe?: string[];
  budget?: string;
  accessibility?: string[];
  timePreference?: string;
  travelStyle?: string;
  business?: string[];
  entertainment?: string[];
}

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
  }>;
  // Enterprise/Pro teams: role assignments and channels
  teamsAndChannels: {
    memberRoles: Array<{
      userId: string;
      memberName: string;
      basicRole: string;
      enterpriseRole?: string;
      roleDescription?: string;
    }>;
    channels: Array<{
      id: string;
      name: string;
      description?: string;
      type: string;
    }>;
  };
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
  broadcasts: Array<{
    id: string;
    message: string;
    priority: string;
    createdBy: string;
    createdAt: string;
  }>;
  places: {
    tripBasecamp?: {
      name: string;
      address: string;
      lat?: number;
      lng?: number;
    };
    personalBasecamp?: {
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
  // Only populated for paid users (passed in via isPaidUser flag)
  userPreferences?: UserPreferences;
}

export class TripContextBuilder {
  /**
   * Build full trip context for the AI concierge.
   *
   * Design: two-phase approach
   *   Phase 1 — parallel DB fetches (all tables, no profile lookups yet)
   *   Phase 2 — one consolidated batch lookup to profiles_public for all user IDs
   *
   * This replaces the previous pattern where 7 methods each did their own
   * sequential profile lookup, producing 7 sequential sub-chains inside the
   * parallel block. Now there is exactly one sequential step (batchFetchNames)
   * after all data arrives, typically adding ~10-20 ms instead of ~50-100 ms.
   *
   * @param isPaidUser  When true, user preferences are fetched and included.
   *                    Pass false (default) for free-tier users.
   */
  static async buildContext(
    tripId: string,
    userId?: string,
    authHeader?: string | null,
    isPaidUser = false,
  ): Promise<ComprehensiveTripContext> {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      ...(authHeader
        ? { global: { headers: { Authorization: authHeader } } }
        : {}),
    });

    try {
      // ── Phase 1: All raw data in parallel (no profile lookups yet) ─────────
      const [
        tripMetadata,
        rawMembers,
        messages,
        calendar,
        rawTasks,
        rawPayments,
        polls,
        rawBroadcasts,
        places,
        rawFiles,
        rawLinks,
        rawTeamsChannels,
        userPreferences,
      ] = await Promise.all([
        this.fetchTripMetadata(supabase, tripId),
        this.fetchRawMembers(supabase, tripId),
        this.fetchMessages(supabase, tripId),
        this.fetchCalendar(supabase, tripId),
        this.fetchRawTasks(supabase, tripId),
        this.fetchRawPayments(supabase, tripId),
        this.fetchPolls(supabase, tripId),
        this.fetchRawBroadcasts(supabase, tripId),
        this.fetchPlaces(supabase, tripId, userId),
        this.fetchRawFiles(supabase, tripId),
        this.fetchRawLinks(supabase, tripId),
        this.fetchRawTeamsAndChannels(supabase, tripId),
        // Preferences only fetched for paid users — free tier gets undefined
        isPaidUser && userId
          ? this.fetchUserPreferences(supabase, userId)
          : Promise.resolve(undefined),
      ]);

      // ── Phase 2: Collect ALL user IDs needing display names ───────────────
      const allUserIds = new Set<string>();
      rawMembers.forEach((m: any) => m.user_id && allUserIds.add(m.user_id));
      rawTasks.forEach((t: any) => t.assignee_id && allUserIds.add(t.assignee_id));
      rawPayments.forEach((p: any) => p.created_by && allUserIds.add(p.created_by));
      rawBroadcasts.forEach((b: any) => b.created_by && allUserIds.add(b.created_by));
      rawFiles.forEach((f: any) => f.uploaded_by && allUserIds.add(f.uploaded_by));
      rawLinks.forEach((l: any) => l.added_by && allUserIds.add(l.added_by));
      rawTeamsChannels.members.forEach((m: any) => m.user_id && allUserIds.add(m.user_id));

      // ONE batch lookup for all display names
      const names = await this.batchFetchNames(supabase, [...allUserIds]);

      // ── Phase 3: Map names → final structured output ───────────────────────
      const collaborators = rawMembers.map((m: any) => ({
        id: m.user_id,
        name: names.get(m.user_id) || 'Chravel User',
        role: m.role || 'member',
      }));

      const tasks = rawTasks.map((t: any) => ({
        id: t.id,
        content: t.content,
        assignee: t.assignee_id ? (names.get(t.assignee_id) || 'Team Member') : undefined,
        dueDate: t.due_date,
        isComplete: t.is_complete,
      }));

      const payments = rawPayments.map((p: any) => ({
        id: p.id,
        description: p.description,
        amount: p.amount,
        paidBy: p.created_by ? (names.get(p.created_by) || 'Trip Member') : 'Unknown',
        participants: p.split_participants as string[],
        isSettled: p.is_settled,
      }));

      const broadcasts = rawBroadcasts.map((b: any) => ({
        id: b.id,
        message: b.message,
        priority: b.priority || 'normal',
        createdBy: names.get(b.created_by) || 'Organizer',
        createdAt: b.created_at,
      }));

      const files = rawFiles.map((f: any) => ({
        id: f.id,
        name: f.file_name,
        type: f.file_type,
        url: f.file_url,
        uploadedBy: f.uploaded_by ? (names.get(f.uploaded_by) || 'Trip Member') : 'Unknown',
        uploadedAt: f.created_at,
      }));

      const links = rawLinks.map((l: any) => ({
        id: l.id,
        url: l.url,
        title: l.title,
        category: l.category,
        addedBy: l.added_by ? (names.get(l.added_by) || 'Trip Member') : 'Unknown',
      }));

      const teamsAndChannels = {
        memberRoles: rawTeamsChannels.members.map((m: any) => ({
          userId: m.user_id,
          memberName: names.get(m.user_id) || 'Team Member',
          basicRole: m.role || 'member',
          enterpriseRole: rawTeamsChannels.roleMap.get(m.user_id)?.roleName,
          roleDescription: rawTeamsChannels.roleMap.get(m.user_id)?.roleDescription,
        })),
        channels: rawTeamsChannels.channels.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || undefined,
          type: c.type || 'general',
        })),
      };

      return {
        tripMetadata,
        collaborators,
        teamsAndChannels,
        messages,
        calendar,
        tasks,
        payments,
        polls,
        broadcasts,
        places,
        media: { files, links },
        userPreferences,
      };
    } catch (error) {
      console.error('Error building trip context:', error);
      throw new Error('Failed to build comprehensive trip context');
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Shared helper: one query to profiles_public for any set of user IDs
  // ────────────────────────────────────────────────────────────────────────────

  private static async batchFetchNames(
    supabase: any,
    userIds: string[],
  ): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    if (!userIds.length) return names;

    try {
      const { data } = await supabase
        .from('profiles_public')
        .select('user_id, resolved_display_name')
        .in('user_id', userIds);

      (data || []).forEach((p: any) => {
        names.set(p.user_id, p.resolved_display_name || 'Chravel User');
      });
    } catch (error) {
      console.error('[contextBuilder] batchFetchNames failed:', error);
    }

    return names;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Raw fetchers — return plain DB rows, no name resolution
  // ────────────────────────────────────────────────────────────────────────────

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
        type: (data.trip_type || 'consumer') as 'consumer' | 'pro' | 'event',
      };
    } catch (error) {
      console.error('Error fetching trip metadata:', error);
      return {
        id: tripId,
        name: 'Unknown Trip',
        destination: 'Unknown',
        startDate: '',
        endDate: '',
        type: 'consumer' as const,
      };
    }
  }

  private static async fetchRawMembers(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select('user_id, role')
        .eq('trip_id', tripId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching members:', error);
      return [];
    }
  }

  // Messages use the stored author_name column — no profile lookup needed
  private static async fetchMessages(supabase: any, tripId: string) {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data, error } = await supabase
        .from('trip_chat_messages')
        .select('id, content, author_name, created_at, message_type, privacy_mode, privacy_encrypted')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      let messages = data || [];

      // Extend to 72-hour window if all 50 fit within it
      if (messages.length === 50) {
        const oldestTimestamp = new Date(messages[messages.length - 1]?.created_at);
        if (oldestTimestamp > threeDaysAgo) {
          const { data: timeData } = await supabase
            .from('trip_chat_messages')
            .select('id, content, author_name, created_at, message_type, privacy_mode, privacy_encrypted')
            .eq('trip_id', tripId)
            .gte('created_at', threeDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(100);

          if (timeData && timeData.length > messages.length) {
            messages = timeData;
          }
        }
      }

      // Never send encrypted or high-privacy messages to AI
      const visible = messages.filter(
        (m: any) => !m.privacy_encrypted && m.privacy_mode !== 'high',
      );

      return visible
        .map((m: any) => ({
          id: m.id,
          content: m.content,
          authorName: m.author_name,
          timestamp: m.created_at,
          type: (m.message_type === 'broadcast' ? 'broadcast' : 'message') as 'message' | 'broadcast',
        }))
        .reverse();
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

      return (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        description: e.description,
      }));
    } catch (error) {
      console.error('Error fetching calendar:', error);
      return [];
    }
  }

  private static async fetchRawTasks(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_tasks')
        .select('id, content, assignee_id, due_date, is_complete')
        .eq('trip_id', tripId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  private static async fetchRawPayments(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_payment_messages')
        .select('id, description, amount, created_by, split_participants, is_settled')
        .eq('trip_id', tripId);

      if (error) throw error;
      return data || [];
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

      return (data || []).map((p: any) => ({
        id: p.id,
        question: p.question,
        options: p.options as Array<{ text: string; votes: number }>,
        status: p.status as 'active' | 'closed',
      }));
    } catch (error) {
      console.error('Error fetching polls:', error);
      return [];
    }
  }

  private static async fetchRawBroadcasts(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('id, message, priority, created_by, created_at')
        .eq('trip_id', tripId)
        .eq('is_sent', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      return [];
    }
  }

  private static async fetchPlaces(supabase: any, tripId: string, userId?: string) {
    try {
      const { data: trip } = await supabase
        .from('trips')
        .select('basecamp_name, basecamp_address, basecamp_latitude, basecamp_longitude')
        .eq('id', tripId)
        .single();

      const { data: places } = await supabase
        .from('trip_places')
        .select('name, address, category')
        .eq('trip_id', tripId);

      let personalBasecamp = undefined;
      if (userId) {
        const { data: pb } = await supabase
          .from('trip_personal_basecamps')
          .select('name, address, latitude, longitude')
          .eq('trip_id', tripId)
          .eq('user_id', userId)
          .maybeSingle();

        if (pb?.name) {
          personalBasecamp = {
            name: pb.name,
            address: pb.address,
            lat: pb.latitude,
            lng: pb.longitude,
          };
        }
      }

      return {
        tripBasecamp: trip?.basecamp_name
          ? {
              name: trip.basecamp_name,
              address: trip.basecamp_address,
              lat: trip.basecamp_latitude,
              lng: trip.basecamp_longitude,
            }
          : undefined,
        personalBasecamp,
        savedPlaces: (places || []).map((p: any) => ({
          name: p.name,
          address: p.address,
          category: p.category,
        })),
      };
    } catch (error) {
      console.error('Error fetching places:', error);
      return { tripBasecamp: undefined, personalBasecamp: undefined, savedPlaces: [] };
    }
  }

  private static async fetchRawFiles(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_files')
        .select('id, file_name, file_type, file_url, uploaded_by, created_at')
        .eq('trip_id', tripId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  }

  private static async fetchRawLinks(supabase: any, tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_links')
        .select('id, url, title, category, added_by')
        .eq('trip_id', tripId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching links:', error);
      return [];
    }
  }

  /**
   * Fetch enterprise role assignments and chat channels.
   * Returns raw data; name resolution happens in buildContext via batchFetchNames.
   * Gracefully returns empty data for consumer trips with no roles/channels.
   */
  private static async fetchRawTeamsAndChannels(supabase: any, tripId: string) {
    try {
      const [userRolesRes, channelsRes, membersRes] = await Promise.all([
        supabase
          .from('user_trip_roles')
          .select('user_id, trip_roles(role_name, description)')
          .eq('trip_id', tripId),
        supabase
          .from('trip_channels')
          .select('id, name, description, type')
          .eq('trip_id', tripId)
          .eq('is_archived', false),
        supabase
          .from('trip_members')
          .select('user_id, role')
          .eq('trip_id', tripId)
          .eq('status', 'active'),
      ]);

      const members = membersRes.data || [];
      const channels = channelsRes.data || [];

      // Build enterprise role map (role_name/description per user)
      const roleMap = new Map<string, { roleName: string; roleDescription: string }>();
      (userRolesRes.data || []).forEach((ur: any) => {
        if (ur.trip_roles) {
          roleMap.set(ur.user_id, {
            roleName: ur.trip_roles.role_name,
            roleDescription: ur.trip_roles.description || '',
          });
        }
      });

      return { members, roleMap, channels };
    } catch (error) {
      console.error('Error fetching teams and channels:', error);
      return { members: [], roleMap: new Map(), channels: [] };
    }
  }

  private static async fetchUserPreferences(
    supabase: any,
    userId: string,
  ): Promise<UserPreferences | undefined> {
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .maybeSingle();

      const prefs = data?.preferences?.ai_concierge_preferences;
      if (!prefs) return undefined;

      return {
        dietary: prefs.dietary || [],
        vibe: prefs.vibe || [],
        budget:
          prefs.budgetMin !== undefined && prefs.budgetMax !== undefined
            ? `$${prefs.budgetMin}-$${prefs.budgetMax}`
            : undefined,
        accessibility: prefs.accessibility || [],
        timePreference: prefs.timePreference || 'flexible',
        travelStyle: prefs.lifestyle?.join(', ') || undefined,
        business: prefs.business || [],
        entertainment: prefs.entertainment || [],
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return undefined;
    }
  }
}
