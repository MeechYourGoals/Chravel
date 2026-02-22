import { supabase } from '@/integrations/supabase/client';
import { cacheEntity, getCachedEntity } from '@/offline/cache';

export interface TripMediaItem {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata: Record<string, unknown>;
  created_at: string;
  source: 'chat' | 'upload';
  mime_type?: string | null;
}

const MEDIA_PAGE_SIZE = 50;

function buildMediaItems(
  mediaData: Array<Record<string, unknown>>,
  filesData: Array<Record<string, unknown>>,
): TripMediaItem[] {
  return [
    ...mediaData.map(item => ({
      id: item.id as string,
      media_url: item.media_url as string,
      filename: (item.filename as string) || 'Untitled',
      media_type: item.media_type as TripMediaItem['media_type'],
      metadata: (item.metadata as Record<string, unknown>) || {},
      created_at: item.created_at as string,
      source: (item.message_id ? 'chat' : 'upload') as 'chat' | 'upload',
      mime_type: item.mime_type as string | null,
    })),
    ...filesData.map(item => ({
      id: item.id as string,
      media_url: `/storage/trip-files/${item.name}`,
      filename: item.name as string,
      media_type: item.file_type as TripMediaItem['media_type'],
      metadata: { extracted_events: item.extracted_events } as Record<string, unknown>,
      created_at: item.created_at as string,
      source: 'upload' as const,
    })),
  ];
}

export const fetchTripMediaItems = async (tripId: string): Promise<TripMediaItem[]> => {
  const listKey = `${tripId}:list`;
  try {
    const result = await fetchTripMediaItemsPaginated(tripId);
    await cacheEntity({ entityType: 'trip_media', entityId: listKey, tripId, data: result.items });
    return result.items;
  } catch {
    const cached = await getCachedEntity({ entityType: 'trip_media', entityId: listKey });
    return (cached?.data as TripMediaItem[] | undefined) ?? [];
  }
};

export interface FetchMediaPageResult {
  items: TripMediaItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const fetchTripMediaItemsPaginated = async (
  tripId: string,
  cursor?: string,
): Promise<FetchMediaPageResult> => {
  const mediaQuery = supabase
    .from('trip_media_index')
    .select('id, media_url, filename, media_type, metadata, created_at, message_id, mime_type')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(MEDIA_PAGE_SIZE);

  const filesQuery = supabase
    .from('trip_files')
    .select('id, name, file_type, extracted_events, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(MEDIA_PAGE_SIZE);

  if (cursor) {
    mediaQuery.lt('created_at', cursor);
    filesQuery.lt('created_at', cursor);
  }

  const [mediaResponse, filesResponse] = await Promise.all([mediaQuery, filesQuery]);

  const mediaData = mediaResponse.data || [];
  const filesData = filesResponse.data || [];

  const allItems = buildMediaItems(
    mediaData as Array<Record<string, unknown>>,
    filesData as Array<Record<string, unknown>>,
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pageItems = allItems.slice(0, MEDIA_PAGE_SIZE);
  const lastItem = pageItems[pageItems.length - 1];
  const hasMore = allItems.length > MEDIA_PAGE_SIZE;
  const nextCursor = lastItem && hasMore ? lastItem.created_at : null;

  return {
    items: pageItems,
    nextCursor,
    hasMore: !!nextCursor,
  };
};
