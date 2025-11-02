/**
 * Data Fetching and Transformation for PDF Export
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { generateQRSvg } from './qr.ts';
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

  // Generate deeplink QR
  const deeplink = `https://chravelapp.com/trip/${tripId}`;
  const deeplinkQrSvg = generateQRSvg(deeplink, 96);

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
    deeplinkQrSvg,
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
    data.payments = payments.items;
    data.totals = payments.totals;
  }

  if (sections.includes('polls')) {
    data.polls = await fetchPolls(supabase, tripId);
  }

  if (sections.includes('tasks')) {
    data.tasks = await fetchTasks(supabase, tripId);
  }

  if (sections.includes('places')) {
    data.places = await fetchPlaces(supabase, tripId);
  }

  if (sections.includes('broadcasts') && layout === 'pro') {
    console.log('[EXPORT-DATA] Fetching broadcasts (Pro only)');
    data.broadcasts = await fetchBroadcasts(supabase, tripId);
  }

  if (sections.includes('attachments') && layout === 'pro') {
    console.log('[EXPORT-DATA] Fetching attachments (Pro only)');
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

async function fetchPlaces(supabase: SupabaseClient, tripId: string): Promise<LinkItem[]> {
  try {
    console.log('[EXPORT-DATA] Fetching places for trip:', tripId);
    
    const { data: links, error } = await supabase
      .from('trip_links')
      .select('title, url, category, description, created_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[EXPORT-DATA] Error fetching places:', error);
      return [];
    }

    if (!links || links.length === 0) {
      console.log('[EXPORT-DATA] No places found');
      return [];
    }

    console.log('[EXPORT-DATA] Found', links.length, 'places');

    return links.map(link => {
      // Extract domain from URL
      let domain = '';
      try {
        if (link.url) {
          const urlObj = new URL(link.url);
          domain = urlObj.hostname.replace('www.', '');
        }
      } catch {
        domain = 'Unknown';
      }

      return {
        title: link.title || 'Untitled',
        url: link.url || '',
        domain,
        category: link.category || undefined,
        notes: link.description || undefined,
        qrSvg: link.url ? generateQRSvg(link.url, 48) : undefined,
      };
    });
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

async function fetchAttachments(supabase: SupabaseClient, tripId: string) {
  const { data: files } = await supabase
    .from('trip_files')
    .select('filename, filetype, uploaded_by, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  return (files || []).map((f: any) => ({
    name: f.filename || 'Unknown',
    type: f.filetype || 'file',
    uploaded_by: f.uploaded_by || undefined,
    date: f.created_at ? formatDateTime(f.created_at) : undefined,
  }));
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
