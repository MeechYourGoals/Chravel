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
    title: string;
    description?: string;
    creator?: string;
    dueAt?: string;
    completed: boolean;
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
      category?: string;
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

const CONTEXT_CACHE_TTL_MS = 30_000; // 30 seconds — balances speed vs freshness
const contextCache = new Map<string, { ctx: ComprehensiveTripContext; expiresAt: number }>();

export class TripContextBuilder {
  /**
   * Build or return cached trip context. Cache TTL 30s to speed up rapid successive messages.
   */
  static async buildContextWithCache(
    tripId: string,
    userId?: string,
    authHeader?: string | null,
    isPaidUser = false,
    clientPreferences?: Parameters<typeof TripContextBuilder.buildContext>[4],
  ): Promise<ComprehensiveTripContext> {
    const key = `${tripId}:${userId ?? 'anon'}`;
    const now = Date.now();
    const cached = contextCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.ctx;
    }
    const ctx = await this.buildContext(tripId, userId, authHeader, isPaidUser, clientPreferences);
    contextCache.set(key, { ctx, expiresAt: now + CONTEXT_CACHE_TTL_MS });
    return ctx;
  }

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
   * @param clientPreferences  When provided and has content, skips DB fetch for
   *                           preferences (saves ~20-50ms). Client loads once and
   *                           passes on every request.
   */
  static async buildContext(
    tripId: string,
    userId?: string,
    authHeader?: string | null,
    isPaidUser = false,
    clientPreferences?: {
      dietary?: string[];
      vibe?: string[];
      accessibility?: string[];
      business?: string[];
      entertainment?: string[];
      lifestyle?: string[];
      budgetMin?: number;
      budgetMax?: number;
      budgetUnit?: string;
      timePreference?: string;
    },
  ): Promise<ComprehensiveTripContext> {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      ...(authHeader ? { global: { headers: { Authorization: authHeader } } } : {}),
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
        // Preferences: use client-provided when available (saves DB round-trip),
        // else fetch for paid users
        this.resolveUserPreferences(supabase, userId, isPaidUser, clientPreferences),
      ]);

      // ── Phase 2: Collect ALL user IDs needing display names ───────────────
      const allUserIds = new Set<string>();
      rawMembers.forEach((m: any) => m.user_id && allUserIds.add(m.user_id));
      rawTasks.forEach((t: any) => t.creator_id && allUserIds.add(t.creator_id));
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
        title: t.title,
        description: t.description || undefined,
        creator: t.creator_id ? names.get(t.creator_id) || 'Team Member' : undefined,
        dueAt: t.due_at || undefined,
        completed: !!t.completed,
      }));

      const payments = rawPayments.map((p: any) => ({
        id: p.id,
        description: p.description,
        amount: p.amount,
        paidBy: p.created_by ? names.get(p.created_by) || 'Trip Member' : 'Unknown',
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
        name: f.name,
        type: f.file_type,
        category: f.file_category || undefined,
        uploadedBy: f.uploaded_by ? names.get(f.uploaded_by) || 'Trip Member' : 'Unknown',
        uploadedAt: f.created_at,
      }));

      const links = rawLinks.map((l: any) => ({
        id: l.id,
        url: l.url,
        title: l.title,
        category: l.category,
        addedBy: l.added_by ? names.get(l.added_by) || 'Trip Member' : 'Unknown',
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
  // Resolve user preferences: client-provided (fast) or DB fetch
  // ────────────────────────────────────────────────────────────────────────────

  private static async resolveUserPreferences(
    supabase: any,
    userId: string | undefined,
    isPaidUser: boolean,
    clientPreferences?: {
      dietary?: string[];
      vibe?: string[];
      accessibility?: string[];
      business?: string[];
      entertainment?: string[];
      lifestyle?: string[];
      budgetMin?: number;
      budgetMax?: number;
      budgetUnit?: string;
      timePreference?: string;
    },
  ): Promise<UserPreferences | undefined> {
    const hasClientPrefs =
      (clientPreferences?.dietary?.length ?? 0) > 0 ||
      (clientPreferences?.vibe?.length ?? 0) > 0 ||
      (clientPreferences?.accessibility?.length ?? 0) > 0 ||
      (clientPreferences?.business?.length ?? 0) > 0 ||
      (clientPreferences?.entertainment?.length ?? 0) > 0 ||
      (clientPreferences?.lifestyle?.length ?? 0) > 0 ||
      clientPreferences?.budgetMin !== undefined ||
      clientPreferences?.budgetMax !== undefined;

    if (hasClientPrefs && clientPreferences) {
      const unit = clientPreferences.budgetUnit || 'experience';
      const budget =
        clientPreferences.budgetMin !== undefined && clientPreferences.budgetMax !== undefined
          ? `$${clientPreferences.budgetMin}-$${clientPreferences.budgetMax} ${unit === 'day' ? 'per day' : unit === 'person' ? 'per person' : unit === 'trip' ? 'per trip' : 'per experience'}`
          : undefined;

      return {
        dietary: clientPreferences.dietary || [],
        vibe: clientPreferences.vibe || [],
        budget,
        accessibility: clientPreferences.accessibility || [],
        timePreference: clientPreferences.timePreference || 'flexible',
        travelStyle: clientPreferences.lifestyle?.join(', '),
        business: clientPreferences.business || [],
        entertainment: clientPreferences.entertainment || [],
      };
    }

    if (isPaidUser && userId) {
      return this.fetchUserPreferences(supabase, userId);
    }

    return undefined;
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
  // Tighter limits (30/50) for faster fetches and smaller prompts
  private static async fetchMessages(supabase: any, tripId: string) {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data, error } = await supabase
        .from('trip_chat_messages')
        .select(
          'id, content, author_name, created_at, message_type, privacy_mode, privacy_encrypted',
        )
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      let messages = data || [];

      // Extend to 72-hour window if all 30 fit within it
      if (messages.length === 30) {
        const oldestTimestamp = new Date(messages[messages.length - 1]?.created_at);
        if (oldestTimestamp > threeDaysAgo) {
          const { data: timeData } = await supabase
            .from('trip_chat_messages')
            .select(
              'id, content, author_name, created_at, message_type, privacy_mode, privacy_encrypted',
            )
            .eq('trip_id', tripId)
            .gte('created_at', threeDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(50);

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
          type: (m.message_type === 'broadcast' ? 'broadcast' : 'message') as
            | 'message'
            | 'broadcast',
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
        .select('id, title, description, creator_id, due_at, completed')
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
        .select('id, name, file_type, file_category, uploaded_by, created_at')
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
            ? `$${prefs.budgetMin}-$${prefs.budgetMax} ${prefs.budgetUnit === 'day' ? 'per day' : prefs.budgetUnit === 'person' ? 'per person' : prefs.budgetUnit === 'trip' ? 'per trip' : 'per experience'}`
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
