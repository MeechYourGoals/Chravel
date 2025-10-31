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
  // Get trip timezone first
  const { data: trip } = await supabase
    .from('trips')
    .select('timezone')
    .eq('id', tripId)
    .single();

  const timezone = trip?.timezone || 'UTC';

  // Query with timezone-aware timestamps
  const { data: events } = await supabase.rpc('get_trip_events_with_timezone', {
    p_trip_id: tripId
  });

  // Fallback to simple query if RPC doesn't exist
  if (!events) {
    const { data: fallbackEvents } = await supabase
      .from('trip_events')
      .select('id, title, location, notes, start_time, end_time')
      .eq('trip_id', tripId)
      .order('start_time', { ascending: true });

    return (fallbackEvents || []).map(e => ({
      dayLabel: formatDateDay(e.start_time),
      time: formatTime(e.start_time),
      title: e.title || '',
      location: e.location || undefined,
      notes: e.notes || undefined,
    }));
  }

  return (events || []).map(e => ({
    dayLabel: formatDateDay(e.start_local || e.start_time),
    time: formatTime(e.start_local || e.start_time),
    title: e.title || '',
    location: e.location || undefined,
    notes: e.notes || undefined,
  }));
}

async function fetchPayments(supabase: SupabaseClient, tripId: string) {
  // Fetch payments with payer name and splits in one query
  const { data: paymentSplits } = await supabase
    .from('payment_splits')
    .select(`
      payment_message_id,
      amount_owed,
      settled,
      settled_at,
      debtor:profiles!debtor_user_id(display_name),
      payment:trip_payment_messages!payment_message_id(
        id,
        trip_id,
        title,
        amount,
        currency,
        status,
        due_at,
        created_at,
        payer:profiles!user_id(display_name)
      )
    `)
    .eq('trip_payment_messages.trip_id', tripId);

  // Group by payment_id
  const paymentMap = new Map<string, PaymentItem>();
  let totalAmount = 0;
  let currency = 'USD';

  for (const split of paymentSplits || []) {
    const payment = split.payment as any;
    if (!payment) continue;

    const paymentId = payment.id;

    if (!paymentMap.has(paymentId)) {
      totalAmount += payment.amount || 0;
      currency = payment.currency || 'USD';

      paymentMap.set(paymentId, {
        title: payment.title || 'Untitled',
        payer: payment.payer?.display_name || 'Unknown',
        amount: payment.amount || 0,
        currency: payment.currency || 'USD',
        status: payment.status || 'Pending',
        due: payment.due_at ? formatDate(payment.due_at) : undefined,
        split: [],
      });
    }

    const item = paymentMap.get(paymentId)!;
    item.split.push({
      name: split.debtor?.display_name || 'Unknown',
      owes: split.amount_owed || 0,
      paid: split.settled || false,
      paid_at: split.settled_at ? formatDateTime(split.settled_at) : null,
    });
  }

  const items = Array.from(paymentMap.values());

  return {
    items,
    totals: {
      paymentsTotal: totalAmount,
      currency,
    },
  };
}

async function fetchPolls(supabase: SupabaseClient, tripId: string): Promise<PollItem[]> {
  // Fetch polls
  const { data: polls } = await supabase
    .from('trip_polls')
    .select('id, question, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (!polls || polls.length === 0) return [];

  const pollIds = polls.map(p => p.id);

  // Fetch all options for these polls
  const { data: options } = await supabase
    .from('trip_poll_options')
    .select('poll_id, text, votes, is_winner, created_at')
    .in('poll_id', pollIds)
    .order('created_at', { ascending: true });

  // Group options by poll_id
  const optionsMap = new Map<string, any[]>();
  for (const option of options || []) {
    if (!optionsMap.has(option.poll_id)) {
      optionsMap.set(option.poll_id, []);
    }
    optionsMap.get(option.poll_id)!.push(option);
  }

  return polls.map(poll => {
    const pollOptions = optionsMap.get(poll.id) || [];
    const maxVotes = Math.max(...pollOptions.map(o => o.votes || 0), 0);

    return {
      question: poll.question || '',
      options: pollOptions.map(opt => ({
        text: opt.text || '',
        votes: opt.votes || 0,
        winner: opt.is_winner || ((opt.votes || 0) === maxVotes && maxVotes > 0),
      })),
    };
  });
}

async function fetchTasks(supabase: SupabaseClient, tripId: string): Promise<TaskItem[]> {
  const { data: tasks } = await supabase
    .from('trip_tasks')
    .select('title, owner_name, due_at, status')
    .eq('trip_id', tripId)
    .order('due_at', { ascending: true, nullsFirst: false });

  return (tasks || []).map((t: any) => ({
    title: t.title || '',
    owner: t.owner_name || undefined,
    due: t.due_at ? formatDate(t.due_at) : undefined,
    status: t.status || 'Open',
  }));
}

async function fetchPlaces(supabase: SupabaseClient, tripId: string): Promise<LinkItem[]> {
  const { data: links } = await supabase
    .from('trip_link_index')
    .select('og_title, title, url, domain, category, notes, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  return (links || []).map(link => {
    return {
      title: link.og_title || link.title || 'Untitled',
      url: link.url || '',
      domain: link.domain || '',
      category: link.category || undefined,
      notes: link.notes || undefined,
      qrSvg: link.url ? generateQRSvg(link.url, 48) : undefined,
    };
  });
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
