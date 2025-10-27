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
  // Fetch trip details
  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (!trip) {
    throw new Error('Trip not found');
  }

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
    subtitle: trip.description,
    destination: trip.destination,
    startDate,
    endDate,
    coverImageUrl: trip.cover_image_url,
    deeplinkQrSvg,
    generatedAtLocal,
    layout,
    privacyRedaction,
  };

  // Fetch sections based on request
  if (sections.includes('roster') && layout === 'pro') {
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
    data.broadcasts = await fetchBroadcasts(supabase, tripId);
  }

  if (sections.includes('attachments') && layout === 'pro') {
    data.attachments = await fetchAttachments(supabase, tripId);
  }

  return data;
}

async function fetchRoster(supabase: SupabaseClient, tripId: string, privacyRedaction: boolean): Promise<Member[]> {
  const { data } = await supabase
    .from('trip_members')
    .select(`
      user_id,
      role,
      profiles!inner(
        display_name,
        email,
        phone
      )
    `)
    .eq('trip_id', tripId);

  return (data || []).map((m: any) => ({
    id: m.user_id,
    name: m.profiles?.display_name || 'Unknown',
    role: m.role,
    email: privacyRedaction ? undefined : m.profiles?.email,
    phone: privacyRedaction ? undefined : m.profiles?.phone,
  }));
}

async function fetchCalendar(supabase: SupabaseClient, tripId: string): Promise<EventItem[]> {
  const { data: events } = await supabase
    .from('trip_events')
    .select('*')
    .eq('trip_id', tripId)
    .order('start_time', { ascending: true });

  return (events || []).map(e => ({
    dayLabel: formatDateDay(e.start_time),
    time: formatTime(e.start_time),
    title: e.title,
    location: e.location,
    notes: e.description,
  }));
}

async function fetchPayments(supabase: SupabaseClient, tripId: string) {
  // Fetch payments with payer name
  const { data: payments } = await supabase
    .from('trip_payment_messages')
    .select(`
      *,
      payer:profiles!user_id(display_name)
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  const items: PaymentItem[] = [];
  let totalAmount = 0;
  let currency = 'USD';

  for (const payment of payments || []) {
    // Fetch splits for this payment
    const { data: splits } = await supabase
      .from('payment_splits')
      .select(`
        *,
        debtor:profiles!debtor_user_id(display_name)
      `)
      .eq('payment_message_id', payment.id);

    totalAmount += payment.amount;
    currency = payment.currency;

    items.push({
      title: payment.description,
      payer: payment.payer?.display_name || 'Unknown',
      amount: payment.amount,
      currency: payment.currency,
      status: payment.is_settled ? 'Paid' : 'Pending',
      due: payment.created_at ? formatDate(payment.created_at) : undefined,
      split: (splits || []).map(s => ({
        name: s.debtor?.display_name || 'Unknown',
        owes: s.amount_owed,
        paid: s.is_settled,
        paid_at: s.settled_at ? formatDateTime(s.settled_at) : null,
      })),
    });
  }

  return {
    items,
    totals: {
      paymentsTotal: totalAmount,
      currency,
    },
  };
}

async function fetchPolls(supabase: SupabaseClient, tripId: string): Promise<PollItem[]> {
  const { data: polls } = await supabase
    .from('trip_polls')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  return (polls || []).map(poll => {
    const options = (poll.options as any[]) || [];
    const maxVotes = Math.max(...options.map(o => o.votes || 0));

    return {
      question: poll.question,
      options: options.map(opt => ({
        text: opt.text,
        votes: opt.votes || 0,
        winner: (opt.votes || 0) === maxVotes && maxVotes > 0,
      })),
    };
  });
}

async function fetchTasks(supabase: SupabaseClient, tripId: string): Promise<TaskItem[]> {
  const { data: tasks } = await supabase
    .from('trip_tasks')
    .select(`
      *,
      owner:profiles(display_name)
    `)
    .eq('trip_id', tripId)
    .order('completed', { ascending: true });

  return (tasks || []).map((t: any) => ({
    title: t.title,
    owner: t.owner?.display_name,
    due: t.due_at ? formatDate(t.due_at) : undefined,
    status: t.completed ? 'Done' : 'Open',
  }));
}

async function fetchPlaces(supabase: SupabaseClient, tripId: string): Promise<LinkItem[]> {
  const { data: links } = await supabase
    .from('trip_links')
    .select('*')
    .eq('trip_id', tripId)
    .order('votes', { ascending: false });

  return (links || []).map(link => {
    const url = new URL(link.url);
    return {
      title: link.title,
      url: link.url,
      domain: url.hostname,
      category: link.category,
      notes: link.description,
      qrSvg: generateQRSvg(link.url, 48),
    };
  });
}

async function fetchBroadcasts(supabase: SupabaseClient, tripId: string) {
  const { data: broadcasts } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  return (broadcasts || []).map(b => ({
    ts: formatDateTime(b.created_at),
    priority: b.priority as 'Low' | 'Normal' | 'High',
    message: b.message,
  }));
}

async function fetchAttachments(supabase: SupabaseClient, tripId: string) {
  const { data: files } = await supabase
    .from('trip_files')
    .select(`
      filename,
      filetype,
      created_at,
      uploader:profiles(display_name)
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  return (files || []).map((f: any) => ({
    name: f.filename || 'Unknown',
    type: f.filetype || 'file',
    uploaded_by: f.uploader?.display_name,
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
