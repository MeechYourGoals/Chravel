/**
 * Data Fetching and Transformation for PDF Export
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type {
  TripExportData,
  ExportLayout,
  ExportSection,
  EventItem,
  PaymentItem,
  PollItem,
  TaskItem,
  LinkItem,
  Member,
  AttachmentItem,
} from './types.ts';

export async function getTripData(
  supabase: SupabaseClient,
  tripId: string,
  sections: ExportSection[],
  layout: ExportLayout,
  privacyRedaction: boolean
): Promise<TripExportData> {
  console.log('[EXPORT-DATA] Fetching trip:', tripId, 'layout:', layout);
  
  // Fetch trip details
  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (!trip) {
    console.error('[EXPORT-DATA] Trip not found:', tripId, 'error:', error);
    throw new Error('Trip not found');
  }
  
  console.log('[EXPORT-DATA] Trip found:', trip.name, 'trip_type:', trip.trip_type);

  // Format dates
  const startDate = trip.start_date ? formatDate(trip.start_date) : '';
  const endDate = trip.end_date ? formatDate(trip.end_date) : '';
  const generatedAtLocal = formatDateTime(new Date().toISOString());

  const data: TripExportData = {
    tripId,
    tripTitle: trip.name,
    subtitle: trip.description || undefined,
    destination: trip.destination || undefined,
    startDate,
    endDate,
    generatedAtLocal,
    layout,
    privacyRedaction,
  };

  // Fetch sections based on request
  console.log('[EXPORT-DATA] Fetching sections:', sections);
  
  if (sections.includes('roster') && layout === 'pro') {
    console.log('[EXPORT-DATA] Fetching roster (Pro only)');
    data.roster = await fetchRoster(supabase, tripId, privacyRedaction);
  }

  if (sections.includes('calendar')) {
    data.calendar = await fetchCalendar(supabase, tripId);
  }

  if (sections.includes('payments')) {
    const payments = await fetchPayments(supabase, tripId);
    // Type assertion for payment status mapping
    data.payments = payments.items.map((p: any) => ({
      ...p,
      status: p.status || 'Pending' // Ensure valid status
    })) as any;
    data.totals = payments.totals;
  }

  if (sections.includes('polls')) {
    data.polls = await fetchPolls(supabase, tripId);
  }

  if (sections.includes('tasks')) {
    data.tasks = await fetchTasks(supabase, tripId);
  }

  if (sections.includes('places')) {
    // Pass userId to include personal basecamp in export
    const { data: { user } } = await supabase.auth.getUser();
    data.places = await fetchPlaces(supabase, tripId, user?.id);
  }

  if (sections.includes('broadcasts') && layout === 'pro') {
    console.log('[EXPORT-DATA] Fetching broadcasts (Pro only)');
    data.broadcasts = await fetchBroadcasts(supabase, tripId);
  }

  if (sections.includes('attachments')) {
    // Attachments come from Media → Files/Attachments (trip_files), not chat history.
    console.log('[EXPORT-DATA] Fetching attachments');
    data.attachments = await fetchAttachments(supabase, tripId);
  }

  console.log('[EXPORT-DATA] Data fetching complete. Sections with data:', Object.keys(data).filter(k => Array.isArray(data[k as keyof typeof data])));
  
  return data;
}

async function fetchRoster(supabase: SupabaseClient, tripId: string, privacyRedaction: boolean): Promise<Member[]> {
  const { data } = await supabase
    .from('trip_members')
    .select(`
      user_id,
      role,
      dept,
      profiles!inner(
        display_name,
        email,
        phone
      )
    `)
    .eq('trip_id', tripId)
    .order('profiles(display_name)', { ascending: true });

  return (data || []).map((m: any) => ({
    id: m.user_id,
    name: m.profiles?.display_name || 'Unknown',
    role: m.role || undefined,
    dept: m.dept || undefined,
    email: privacyRedaction ? undefined : m.profiles?.email,
    phone: privacyRedaction ? undefined : m.profiles?.phone,
  }));
}

async function fetchCalendar(supabase: SupabaseClient, tripId: string): Promise<EventItem[]> {
  try {
    console.log('[EXPORT-DATA] Fetching calendar for trip:', tripId);
    
    const { data: events, error } = await supabase
      .from('trip_events')
      .select('id, title, location, description, start_time, end_time')
      .eq('trip_id', tripId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[EXPORT-DATA] Error fetching calendar:', error);
      return [];
    }

    if (!events || events.length === 0) {
      console.log('[EXPORT-DATA] No calendar events found');
      return [];
    }

    console.log('[EXPORT-DATA] Found', events.length, 'calendar events');

    return events.map(e => ({
      dayLabel: formatDateDay(e.start_time),
      time: formatTime(e.start_time),
      title: e.title || '',
      location: e.location || undefined,
      notes: e.description || undefined,
    }));
  } catch (error) {
    console.error('[EXPORT-DATA] Exception fetching calendar:', error);
    return [];
  }
}

async function fetchPayments(supabase: SupabaseClient, tripId: string) {
  try {
    console.log('[EXPORT-DATA] Fetching payments for trip:', tripId);
    
    // First, fetch all payment messages for this trip
    const { data: paymentMessages, error: pmError } = await supabase
      .from('trip_payment_messages')
      .select(`
        id,
        description,
        amount,
        currency,
        split_count,
        created_by,
        created_at,
        creator:profiles!created_by(display_name)
      `)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (pmError) {
      console.error('[EXPORT-DATA] Error fetching payment messages:', pmError);
      return { items: [], totals: { paymentsTotal: 0, currency: 'USD' } };
    }

    if (!paymentMessages || paymentMessages.length === 0) {
      console.log('[EXPORT-DATA] No payments found');
      return { items: [], totals: { paymentsTotal: 0, currency: 'USD' } };
    }

    console.log('[EXPORT-DATA] Found', paymentMessages.length, 'payment messages');

    const paymentIds = paymentMessages.map(pm => pm.id);

    // Fetch splits for these payments
    const { data: splits, error: splitsError } = await supabase
      .from('payment_splits')
      .select(`
        payment_message_id,
        debtor_user_id,
        amount_owed,
        settled,
        settled_at,
        debtor:profiles!debtor_user_id(display_name)
      `)
      .in('payment_message_id', paymentIds);

    if (splitsError) {
      console.error('[EXPORT-DATA] Error fetching splits:', splitsError);
    }

    console.log('[EXPORT-DATA] Found', (splits || []).length, 'payment splits');

    // Group splits by payment_message_id
    const splitsMap = new Map<string, any[]>();
    for (const split of splits || []) {
      if (!splitsMap.has(split.payment_message_id)) {
        splitsMap.set(split.payment_message_id, []);
      }
      splitsMap.get(split.payment_message_id)!.push(split);
    }

    // Build payment items
    let totalAmount = 0;
    let currency = 'USD';

    const items = paymentMessages.map((pm: any) => {
      totalAmount += pm.amount || 0;
      currency = pm.currency || currency;

      const pmSplits = splitsMap.get(pm.id) || [];

      return {
        title: pm.description || 'Untitled Payment',
        payer: pm.creator?.display_name || 'Unknown',
        amount: pm.amount || 0,
        currency: pm.currency || 'USD',
        status: pmSplits.every(s => s.settled) ? 'Paid' : (pmSplits.some(s => s.settled) ? 'Partial' : 'Pending'),
        due: undefined,
        split: pmSplits.map((s: any) => ({
          name: s.debtor?.display_name || 'Unknown',
          owes: s.amount_owed || 0,
          paid: s.settled || false,
          paid_at: s.settled_at ? formatDateTime(s.settled_at) : null,
        })),
      };
    });

    return {
      items,
      totals: {
        paymentsTotal: totalAmount,
        currency,
      },
    };
  } catch (error) {
    console.error('[EXPORT-DATA] Exception fetching payments:', error);
    return { items: [], totals: { paymentsTotal: 0, currency: 'USD' } };
  }
}

async function fetchPolls(supabase: SupabaseClient, tripId: string): Promise<PollItem[]> {
  try {
    console.log('[EXPORT-DATA] Fetching polls for trip:', tripId);
    
    // Fetch polls with options stored in JSONB
    const { data: polls, error } = await supabase
      .from('trip_polls')
      .select('id, question, options, created_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[EXPORT-DATA] Error fetching polls:', error);
      return [];
    }

    if (!polls || polls.length === 0) {
      console.log('[EXPORT-DATA] No polls found');
      return [];
    }

    console.log('[EXPORT-DATA] Found', polls.length, 'polls');

    return polls.map(poll => {
      // Parse options from JSONB - handle both array and object formats
      let pollOptions: any[] = [];
      try {
        if (typeof poll.options === 'string') {
          pollOptions = JSON.parse(poll.options);
        } else if (Array.isArray(poll.options)) {
          pollOptions = poll.options;
        } else if (poll.options && typeof poll.options === 'object') {
          // Handle object format
          pollOptions = Object.values(poll.options);
        }
      } catch (e) {
        console.error('[EXPORT-DATA] Error parsing poll options:', e);
        pollOptions = [];
      }

      const maxVotes = Math.max(...pollOptions.map(o => o.voteCount || o.votes || 0), 0);

      return {
        question: poll.question || '',
        options: pollOptions.map(opt => ({
          text: opt.text || '',
          votes: opt.voteCount || opt.votes || 0,
          winner: (opt.voteCount || opt.votes || 0) === maxVotes && maxVotes > 0,
        })),
      };
    });
  } catch (error) {
    console.error('[EXPORT-DATA] Exception fetching polls:', error);
    return [];
  }
}

async function fetchTasks(supabase: SupabaseClient, tripId: string): Promise<TaskItem[]> {
  try {
    console.log('[EXPORT-DATA] Fetching tasks for trip:', tripId);
    
    // Query with creator profile join
    const { data: tasks, error } = await supabase
      .from('trip_tasks')
      .select(`
        title,
        description,
        due_at,
        completed,
        creator:profiles!creator_id(display_name)
      `)
      .eq('trip_id', tripId)
      .order('due_at', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('[EXPORT-DATA] Error fetching tasks:', error);
      return [];
    }

    if (!tasks || tasks.length === 0) {
      console.log('[EXPORT-DATA] No tasks found');
      return [];
    }

    console.log('[EXPORT-DATA] Found', tasks.length, 'tasks');

    return tasks.map((t: any) => ({
      title: t.title || t.description || 'Untitled Task',
      owner: t.creator?.display_name || undefined,
      due: t.due_at ? formatDate(t.due_at) : undefined,
      status: t.completed ? 'Done' : 'Open',
    }));
  } catch (error) {
    console.error('[EXPORT-DATA] Exception fetching tasks:', error);
    return [];
  }
}

async function fetchPlaces(
  supabase: SupabaseClient, 
  tripId: string,
  userId?: string
): Promise<LinkItem[]> {
  try {
    console.log('[EXPORT-DATA] Fetching places (basecamps + links) for trip:', tripId);
    
    const places: LinkItem[] = [];

    // 1. Fetch Trip Basecamp
    const { data: trip } = await supabase
      .from('trips')
      .select('basecamp_name, basecamp_address, basecamp_latitude, basecamp_longitude')
      .eq('id', tripId)
      .single();

    if (trip?.basecamp_address) {
      const gmapsUrl = trip.basecamp_latitude && trip.basecamp_longitude
        ? `https://www.google.com/maps/search/?api=1&query=${trip.basecamp_latitude},${trip.basecamp_longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.basecamp_address)}`;
      
      places.push({
        title: `🏠 Trip Basecamp${trip.basecamp_name ? ': ' + trip.basecamp_name : ''}`,
        url: gmapsUrl,
        domain: 'maps.google.com',
        category: 'Basecamp',
        notes: trip.basecamp_address,
      });
    }

    // 2. Fetch Personal Basecamp (if userId provided)
    if (userId) {
      const { data: personalAccom } = await supabase
        .from('trip_accommodations')
        .select('name, address, latitude, longitude')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle();

      if (personalAccom?.address) {
        const gmapsUrl = personalAccom.latitude && personalAccom.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${personalAccom.latitude},${personalAccom.longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(personalAccom.address)}`;
        
        places.push({
          title: `📍 Personal Basecamp${personalAccom.name ? ': ' + personalAccom.name : ''}`,
          url: gmapsUrl,
          domain: 'maps.google.com',
          category: 'Personal Basecamp',
          notes: personalAccom.address,
        });
      }
    }

    // 3. Fetch Trip Links
    const { data: links, error } = await supabase
      .from('trip_links')
      .select('title, url, category, description, created_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[EXPORT-DATA] Error fetching trip links:', error);
    } else if (links && links.length > 0) {
      console.log('[EXPORT-DATA] Found', links.length, 'trip links');
      
      for (const link of links) {
        let domain = '';
        try {
          if (link.url) {
            const urlObj = new URL(link.url);
            domain = urlObj.hostname.replace('www.', '');
          }
        } catch {
          domain = 'Unknown';
        }

        places.push({
          title: link.title || 'Untitled',
          url: link.url || '',
          domain,
          category: link.category || undefined,
          notes: link.description || undefined,
        });
      }
    }

    console.log('[EXPORT-DATA] Total places (basecamps + links):', places.length);
    return places;
  } catch (error) {
    console.error('[EXPORT-DATA] Exception fetching places:', error);
    return [];
  }
}

async function fetchBroadcasts(supabase: SupabaseClient, tripId: string) {
  const { data: broadcasts } = await supabase
    .from('broadcasts')
    .select('created_at, priority, message, read_rate')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  return (broadcasts || []).map(b => ({
    ts: formatDateTime(b.created_at),
    priority: b.priority as 'Low' | 'Normal' | 'High',
    message: b.message || '',
    readRate: b.read_rate || undefined,
  }));
}

function classifyAttachmentType(opts: { filename?: string; mimeType?: string; rawType?: string }): string {
  const mime = (opts.mimeType || '').toLowerCase();
  const raw = (opts.rawType || '').toLowerCase();
  const filename = (opts.filename || '').toLowerCase();
  const ext = filename.includes('.') ? filename.split('.').pop() : '';

  if (mime === 'application/pdf' || raw === 'pdf' || ext === 'pdf') return 'PDF';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return 'Image';
  if (['doc', 'docx'].includes(ext || '') || raw.includes('doc')) return 'DOC';
  if (['xls', 'xlsx', 'csv'].includes(ext || '') || raw.includes('xls') || raw.includes('csv')) return 'Spreadsheet';
  if (['ppt', 'pptx'].includes(ext || '') || raw.includes('ppt')) return 'Slides';
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext || '')) return 'Video';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'm4a'].includes(ext || '')) return 'Audio';
  return 'File';
}

async function fetchAttachments(supabase: SupabaseClient, tripId: string): Promise<AttachmentItem[]> {
  // NOTE: trip_files schema has evolved over time. We select a superset of columns
  // and normalize to a stable AttachmentItem shape.
  const { data: files, error } = await supabase
    .from('trip_files')
    .select('id, created_at, uploaded_by, file_name, name, file_type, file_path, file_url, mime_type, file_size, size_bytes')
    .eq('trip_id', tripId)
    // Deterministic ordering: preserve upload order (oldest → newest)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[EXPORT-DATA] Error fetching attachments:', error);
    return [];
  }

  return (files || []).map((f: any) => {
    const displayName: string =
      f.file_name || f.name || f.filename || 'Unknown file';
    const rawType: string =
      f.file_type || f.filetype || f.mime_type || '';
    const mimeType: string | undefined = f.mime_type || (rawType.includes('/') ? rawType : undefined);
    const typeLabel = classifyAttachmentType({ filename: displayName, mimeType, rawType });

    return {
      name: displayName,
      type: typeLabel,
      // We intentionally do NOT resolve uploaded_by → profile/email/phone here.
      // Privacy is enforced and uploader identity is optional in exports.
      uploaded_by: undefined,
      date: f.created_at ? formatDateTime(f.created_at) : undefined,
      path: f.file_path || undefined,
      url: f.file_url || undefined,
      mime_type: mimeType,
      size_bytes: Number(f.size_bytes ?? f.file_size ?? 0) || undefined,
    } satisfies AttachmentItem;
  });
}

// Date formatting helpers
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateDay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
