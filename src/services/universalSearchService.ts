import { supabase } from '@/integrations/supabase/client';

export type ContentType = 'trips' | 'messages' | 'concierge' | 'calendar' | 'task' | 'poll' | 'payment' | 'place' | 'link' | 'media';
export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

/** Escape SQL LIKE/ILIKE wildcards so user input is treated as literal text. */
function escapeSqlLike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export interface UniversalSearchParams {
  query: string;
  contentTypes: ContentType[];
  filters: {
    tripIds?: string[];
    dateRange?: { start: Date; end: Date };
    tags?: string[];
  };
  searchMode?: SearchMode;
  isDemoMode: boolean;
}

export interface UniversalSearchResult {
  id: string;
  contentType: ContentType;
  tripId: string;
  tripName: string;
  title: string;
  snippet: string;
  matchScore: number;
  deepLink: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

/**
 * Search trips
 */
async function searchTrips(
  query: string,
  isDemoMode: boolean,
  tripIds?: string[]
): Promise<UniversalSearchResult[]> {
  const queryLower = query.toLowerCase();

  if (isDemoMode) {
    const mockTrips = (await import('@/data/tripsData')).tripsData;
    return mockTrips
      .filter(trip => {
        const matchesQuery = 
          trip.title.toLowerCase().includes(queryLower) ||
          trip.location.toLowerCase().includes(queryLower);
        const matchesFilter = !tripIds || tripIds.includes(trip.id.toString());
        return matchesQuery && matchesFilter;
      })
      .map(trip => ({
        id: trip.id.toString(),
        contentType: 'trips' as const,
        tripId: trip.id.toString(),
        tripName: trip.title,
        title: trip.title,
        snippet: trip.location,
        matchScore: 0.9,
        deepLink: `/trip/${trip.id}`,
        thumbnailUrl: trip.coverPhoto,
        timestamp: new Date().toISOString()
      }));
  }

  const safeQuery = escapeSqlLike(query);

  const tripQuery = supabase
    .from('trips')
    .select('id, name, destination, start_date, header_image_url')
    .or(`name.ilike.%${safeQuery}%,destination.ilike.%${safeQuery}%`);

  if (tripIds && tripIds.length > 0) {
    tripQuery.in('id', tripIds);
  }

  const { data, error } = await tripQuery.limit(5);
  
  if (error) {
    console.error('Trip search error:', error);
    return [];
  }

  return (data || []).map((trip: any) => ({
    id: trip.id,
    contentType: 'trips' as const,
    tripId: trip.id,
    tripName: trip.name,
    title: trip.name,
    snippet: trip.destination,
    matchScore: 0.9,
    deepLink: `/trip/${trip.id}`,
    thumbnailUrl: trip.header_image_url,
    timestamp: trip.start_date
  }));
}

/**
 * Search chat messages across trips (Trip Chat)
 */
async function searchMessagesAcrossTrips(
  query: string,
  isDemoMode: boolean,
  tripIds?: string[]
): Promise<UniversalSearchResult[]> {
  const queryLower = query.toLowerCase();

  if (isDemoMode) {
    const mockMessages = (await import('@/data/mockSearchData')).mockMessages;
    return mockMessages
      .filter(msg => {
        const matchesQuery = msg.content.toLowerCase().includes(queryLower);
        const matchesTripFilter = !tripIds || tripIds.includes(msg.tripId);
        return matchesQuery && matchesTripFilter;
      })
      .map(msg => ({
        id: msg.id,
        contentType: 'messages' as const,
        tripId: msg.tripId,
        tripName: msg.tripName,
        title: `Message from ${msg.authorName}`,
        snippet: msg.content.slice(0, 100),
        matchScore: 0.85,
        deepLink: `/trip/${msg.tripId}#chat-message-${msg.id}`,
        metadata: { authorName: msg.authorName },
        timestamp: msg.createdAt
      }));
  }

  const safeQuery = escapeSqlLike(query);

  const { data, error } = await supabase
    .from('trip_chat_messages' as any)
    .select('id, content, created_at, trip_id, author_name')
    .ilike('content', `%${safeQuery}%`)
    .order('created_at', { ascending: false })
    .limit(20); // Reduced from 50 to 20

  if (error) {
    console.error('Message search error:', error);
    return [];
  }

  return (data || []).map((msg: any) => ({
    id: msg.id,
    contentType: 'messages' as const,
    tripId: msg.trip_id,
    tripName: 'Trip',
    title: `Message from ${msg.author_name || 'User'}`,
    snippet: (msg.content || '').slice(0, 150),
    matchScore: 0.85,
    deepLink: `/trip/${msg.trip_id}#chat-message-${msg.id}`,
    metadata: { authorName: msg.author_name },
    timestamp: msg.created_at
  }));
}

/**
 * Search concierge messages
 */
async function searchConciergeMessages(
  query: string,
  isDemoMode: boolean,
  tripIds?: string[]
): Promise<UniversalSearchResult[]> {
  if (isDemoMode) {
    // In demo mode, we could return some mock concierge results if needed
    return [];
  }

  const safeQuery = escapeSqlLike(query);

  const conciergeQuery = supabase
    .from('ai_queries')
    .select('id, query_text, response_text, created_at, trip_id')
    .or(`query_text.ilike.%${safeQuery}%,response_text.ilike.%${safeQuery}%`)
    .order('created_at', { ascending: false });

  if (tripIds && tripIds.length > 0) {
    conciergeQuery.in('trip_id', tripIds);
  }

  const { data, error } = await conciergeQuery.limit(20);

  if (error) {
    console.error('Concierge search error:', error);
    return [];
  }

  return (data || []).map((msg: any) => {
    // Determine if query or response matched (or both)
    const queryMatch = msg.query_text?.toLowerCase().includes(query.toLowerCase());
    const text = queryMatch ? msg.query_text : msg.response_text;
    const prefix = queryMatch ? 'You asked: ' : 'Concierge: ';

    return {
      id: msg.id,
      contentType: 'concierge' as const,
      tripId: msg.trip_id,
      tripName: '', // Usually scoped to one trip anyway
      title: 'Concierge Conversation',
      snippet: prefix + (text?.slice(0, 150) || ''),
      matchScore: 0.88,
      deepLink: `/trip/${msg.trip_id}#concierge-message-${msg.id}`,
      timestamp: msg.created_at
    };
  });
}

/**
 * Search calendar events
 */
async function searchCalendarEvents(
  query: string,
  isDemoMode: boolean,
  tripIds?: string[]
): Promise<UniversalSearchResult[]> {
  const queryLower = query.toLowerCase();

  if (isDemoMode) {
    const mockEvents = (await import('@/data/mockSearchData')).mockCalendarEvents;
    return mockEvents
      .filter(event => {
        const matchesQuery = 
          event.title.toLowerCase().includes(queryLower) ||
          event.location?.toLowerCase().includes(queryLower);
        const matchesTripFilter = !tripIds || tripIds.includes(event.tripId);
        return matchesQuery && matchesTripFilter;
      })
      .map(event => ({
        id: event.id,
        contentType: 'calendar' as const,
        tripId: event.tripId,
        tripName: event.tripName,
        title: event.title,
        snippet: `${event.location || 'No location'} - ${new Date(event.startTime).toLocaleString()}`,
        matchScore: 0.88,
        deepLink: `/trip/${event.tripId}#calendar-event-${event.id}`,
        metadata: { location: event.location, startTime: event.startTime },
        timestamp: event.startTime
      }));
  }

  const safeQuery = escapeSqlLike(query);

  const eventQuery = supabase
    .from('trip_events')
    .select('id, title, location, start_time, trip_id, trips(name)')
    .or(`title.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`)
    .order('start_time', { ascending: false });

  if (tripIds && tripIds.length > 0) {
    eventQuery.in('trip_id', tripIds);
  }

  const { data, error } = await eventQuery.limit(20); // Reduced from 30 to 20
  
  if (error) {
    console.error('Calendar search error:', error);
    return [];
  }

  return (data || []).map((event: any) => ({
    id: event.id,
    contentType: 'calendar' as const,
    tripId: event.trip_id,
    tripName: event.trips?.name || 'Unknown Trip',
    title: event.title,
    snippet: `${event.location || 'No location'} - ${new Date(event.start_time).toLocaleString()}`,
    matchScore: 0.88,
    deepLink: `/trip/${event.trip_id}#calendar-event-${event.id}`,
    metadata: { location: event.location, startTime: event.start_time },
    timestamp: event.start_time
  }));
}

/**
 * Search tasks
 */
async function searchTasks(
  query: string,
  isDemoMode: boolean,
  tripIds?: string[]
): Promise<UniversalSearchResult[]> {
  const queryLower = query.toLowerCase();

  if (isDemoMode) {
    const mockTasks = (await import('@/data/mockSearchData')).mockTasks;
    return mockTasks
      .filter(task => {
        const matchesQuery = 
          task.title.toLowerCase().includes(queryLower) ||
          task.description?.toLowerCase().includes(queryLower);
        const matchesTripFilter = !tripIds || tripIds.includes(task.tripId);
        return matchesQuery && matchesTripFilter;
      })
      .map(task => ({
        id: task.id,
        contentType: 'task' as const,
        tripId: task.tripId,
        tripName: task.tripName,
        title: task.title,
        snippet: task.description || 'No description',
        matchScore: 0.86,
        deepLink: `/trip/${task.trip_id}#task-${task.id}`,
        metadata: { priority: task.priority, status: task.status },
        timestamp: task.createdAt
      }));
  }

  const safeQuery = escapeSqlLike(query);

  const taskQuery = supabase
    .from('trip_tasks')
    .select('id, title, description, priority, status, created_at, trip_id, trips(name)')
    .or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
    .order('created_at', { ascending: false });

  if (tripIds && tripIds.length > 0) {
    taskQuery.in('trip_id', tripIds);
  }

  const { data, error } = await taskQuery.limit(20); // Reduced from 30 to 20
  
  if (error) {
    console.error('Task search error:', error);
    return [];
  }

  return (data || []).map((task: any) => ({
    id: task.id,
    contentType: 'task' as const,
    tripId: task.trip_id,
    tripName: task.trips?.name || 'Unknown Trip',
    title: task.title,
    snippet: task.description || 'No description',
    matchScore: 0.86,
    deepLink: `/trip/${task.trip_id}#task-${task.id}`,
    metadata: { priority: task.priority, status: task.status },
    timestamp: task.created_at
  }));
}

/**
 * Search polls
 */
async function searchPolls(
  query: string,
  isDemoMode: boolean,
  tripIds?: string[]
): Promise<UniversalSearchResult[]> {
  const queryLower = query.toLowerCase();

  if (isDemoMode) {
    const mockPolls = (await import('@/data/mockSearchData')).mockPolls;
    return mockPolls
      .filter(poll => {
        const matchesQuery = poll.question.toLowerCase().includes(queryLower);
        const matchesTripFilter = !tripIds || tripIds.includes(poll.tripId);
        return matchesQuery && matchesTripFilter;
      })
      .map(poll => ({
        id: poll.id,
        contentType: 'poll' as const,
        tripId: poll.tripId,
        tripName: poll.tripName,
        title: poll.question,
        snippet: `${poll.totalVotes} votes`,
        matchScore: 0.84,
        deepLink: `/trip/${poll.trip_id}#poll-${poll.id}`,
        metadata: { totalVotes: poll.totalVotes },
        timestamp: poll.createdAt
      }));
  }

  const safeQuery = escapeSqlLike(query);

  const pollQuery = supabase
    .from('trip_polls')
    .select('id, question, total_votes, created_at, trip_id, trips(name)')
    .ilike('question', `%${safeQuery}%`)
    .order('created_at', { ascending: false });

  if (tripIds && tripIds.length > 0) {
    pollQuery.in('trip_id', tripIds);
  }

  const { data, error } = await pollQuery.limit(20);
  
  if (error) {
    console.error('Poll search error:', error);
    return [];
  }

  return (data || []).map((poll: any) => ({
    id: poll.id,
    contentType: 'poll' as const,
    tripId: poll.trip_id,
    tripName: poll.trips?.name || 'Unknown Trip',
    title: poll.question,
    snippet: `${poll.total_votes || 0} votes`,
    matchScore: 0.84,
    deepLink: `/trip/${poll.trip_id}#poll-${poll.id}`,
    metadata: { totalVotes: poll.total_votes },
    timestamp: poll.created_at
  }));
}

/**
 * Search payments
 */
async function searchPayments(
  query: string,
  isDemoMode: boolean,
  tripIds?: string[]
): Promise<UniversalSearchResult[]> {
  if (isDemoMode) {
    // Return empty for now or add mock payments
    return [];
  }

  const safeQuery = escapeSqlLike(query);

  const paymentQuery = supabase
    .from('trip_payment_messages')
    .select('id, description, amount, currency, created_at, trip_id')
    .ilike('description', `%${safeQuery}%`)
    .order('created_at', { ascending: false });

  if (tripIds && tripIds.length > 0) {
    paymentQuery.in('trip_id', tripIds);
  }

  const { data, error } = await paymentQuery.limit(20);

  if (error) {
    console.error('Payment search error:', error);
    return [];
  }

  return (data || []).map((payment: any) => ({
    id: payment.id,
    contentType: 'payment' as const,
    tripId: payment.trip_id,
    tripName: '',
    title: payment.description,
    snippet: `Amount: ${payment.amount} ${payment.currency}`,
    matchScore: 0.86,
    deepLink: `/trip/${payment.trip_id}#payment-${payment.id}`,
    metadata: { amount: payment.amount, currency: payment.currency },
    timestamp: payment.created_at
  }));
}

/**
 * Search places (from trip_link_index)
 */
async function searchPlaces(
  query: string,
  isDemoMode: boolean,
  tripIds?: string[]
): Promise<UniversalSearchResult[]> {
  if (isDemoMode) {
    return [];
  }

  const safeQuery = escapeSqlLike(query);

  const placesQuery = supabase
    .from('trip_link_index')
    .select('id, og_title, og_description, created_at, trip_id')
    .or(`og_title.ilike.%${safeQuery}%,og_description.ilike.%${safeQuery}%`)
    .order('created_at', { ascending: false });

  if (tripIds && tripIds.length > 0) {
    placesQuery.in('trip_id', tripIds);
  }

  const { data, error } = await placesQuery.limit(20);

  if (error) {
    console.error('Places search error:', error);
    return [];
  }

  return (data || []).map((place: any) => ({
    id: place.id,
    contentType: 'place' as const,
    tripId: place.trip_id,
    tripName: '',
    title: place.og_title || 'Untitled Place',
    snippet: place.og_description || '',
    matchScore: 0.84,
    deepLink: `/trip/${place.trip_id}#place-${place.id}`,
    timestamp: place.created_at
  }));
}

/**
 * Search links (from trip_links)
 */
async function searchLinks(
  query: string,
  isDemoMode: boolean,
  tripIds?: string[]
): Promise<UniversalSearchResult[]> {
  if (isDemoMode) {
    return [];
  }

  const safeQuery = escapeSqlLike(query);

  const linksQuery = supabase
    .from('trip_links')
    .select('id, title, description, url, created_at, trip_id')
    .or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,url.ilike.%${safeQuery}%`)
    .order('created_at', { ascending: false });

  if (tripIds && tripIds.length > 0) {
    linksQuery.in('trip_id', tripIds);
  }

  const { data, error } = await linksQuery.limit(20);

  if (error) {
    console.error('Links search error:', error);
    return [];
  }

  return (data || []).map((link: any) => ({
    id: link.id,
    contentType: 'link' as const,
    tripId: link.trip_id,
    tripName: '',
    title: link.title || link.url,
    snippet: link.description || link.url,
    matchScore: 0.82,
    deepLink: `/trip/${link.trip_id}#link-${link.id}`,
    metadata: { url: link.url },
    timestamp: link.created_at
  }));
}

/**
 * Search media files
 */
async function searchMedia(
  query: string,
  isDemoMode: boolean,
  tripIds?: string[]
): Promise<UniversalSearchResult[]> {
  const queryLower = query.toLowerCase();

  if (isDemoMode) {
    const mockMedia = (await import('@/data/mockSearchData')).mockMedia;
    return mockMedia
      .filter(media => {
        const matchesQuery = 
          media.filename.toLowerCase().includes(queryLower) ||
          media.tags?.some(tag => tag.toLowerCase().includes(queryLower));
        const matchesTripFilter = !tripIds || tripIds.includes(media.tripId);
        return matchesQuery && matchesTripFilter;
      })
      .map(media => ({
        id: media.id,
        contentType: 'media' as const,
        tripId: media.tripId,
        tripName: media.tripName,
        title: media.filename,
        snippet: `${media.type} - ${media.tags?.join(', ') || 'No tags'}`,
        matchScore: 0.82,
        deepLink: `/trip/${media.trip_id}#media-${media.id}`,
        metadata: { type: media.type, tags: media.tags },
        timestamp: media.createdAt
      }));
  }

  const safeQuery = escapeSqlLike(query);

  const mediaQuery = supabase
    .from('trip_files')
    .select('id, name, file_type, created_at, trip_id, trips(name)')
    .ilike('name', `%${safeQuery}%`)
    .order('created_at', { ascending: false });

  if (tripIds && tripIds.length > 0) {
    mediaQuery.in('trip_id', tripIds);
  }

  const { data, error } = await mediaQuery.limit(20); // Reduced from 30 to 20
  
  if (error) {
    console.error('Media search error:', error);
    return [];
  }

  return (data || []).map((media: any) => ({
    id: media.id,
    contentType: 'media' as const,
    tripId: media.trip_id,
    tripName: media.trips?.name || 'Unknown Trip',
    title: media.name,
    snippet: media.file_type,
    matchScore: 0.82,
    deepLink: `/trip/${media.trip_id}#media-${media.id}`,
    metadata: { type: media.file_type },
    timestamp: media.created_at
  }));
}

/**
 * Main universal search function
 */
export async function performUniversalSearch(
  params: UniversalSearchParams
): Promise<UniversalSearchResult[]> {
  const { query, contentTypes, filters, isDemoMode } = params;

  if (!query.trim() || query.length < 2) {
    return [];
  }

  const searchPromises: Promise<UniversalSearchResult[]>[] = [];

  // Execute searches in parallel based on selected content types
  if (contentTypes.includes('trips')) {
    searchPromises.push(searchTrips(query, isDemoMode, filters.tripIds));
  }
  if (contentTypes.includes('messages')) {
    searchPromises.push(searchMessagesAcrossTrips(query, isDemoMode, filters.tripIds));
  }
  if (contentTypes.includes('concierge')) {
    searchPromises.push(searchConciergeMessages(query, isDemoMode, filters.tripIds));
  }
  if (contentTypes.includes('calendar')) {
    searchPromises.push(searchCalendarEvents(query, isDemoMode, filters.tripIds));
  }
  if (contentTypes.includes('task')) {
    searchPromises.push(searchTasks(query, isDemoMode, filters.tripIds));
  }
  if (contentTypes.includes('poll')) {
    searchPromises.push(searchPolls(query, isDemoMode, filters.tripIds));
  }
  if (contentTypes.includes('payment')) {
    searchPromises.push(searchPayments(query, isDemoMode, filters.tripIds));
  }
  if (contentTypes.includes('place')) {
    searchPromises.push(searchPlaces(query, isDemoMode, filters.tripIds));
  }
  if (contentTypes.includes('link')) {
    searchPromises.push(searchLinks(query, isDemoMode, filters.tripIds));
  }
  if (contentTypes.includes('media')) {
    searchPromises.push(searchMedia(query, isDemoMode, filters.tripIds));
  }

  // Wait for all searches to complete (settled)
  const results = await Promise.allSettled(searchPromises);

  // Flatten and sort by match score
  const allResults = results
    .map(r => (r.status === 'fulfilled' ? r.value : []))
    .flat();

  return allResults.sort((a, b) => b.matchScore - a.matchScore);
}
