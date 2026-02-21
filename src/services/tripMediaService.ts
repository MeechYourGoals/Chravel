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

export const fetchTripMediaItems = async (tripId: string): Promise<TripMediaItem[]> => {
  const listKey = `${tripId}:list`;

  try {
    const [mediaResponse, filesResponse] = await Promise.all([
      supabase
        .from('trip_media_index')
        .select('id, media_url, filename, media_type, metadata, created_at, message_id, mime_type')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('trip_files')
        .select('id, name, file_type, extracted_events, created_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    const items: TripMediaItem[] = [
      ...(mediaResponse.data || []).map(item => ({
        id: item.id,
        media_url: item.media_url,
        filename: item.filename || 'Untitled',
        media_type: item.media_type as TripMediaItem['media_type'],
        metadata: item.metadata || {},
        created_at: item.created_at,
        source: (item.message_id ? 'chat' : 'upload') as 'chat' | 'upload',
        mime_type: item.mime_type,
      })),
      ...(filesResponse.data || []).map(item => ({
        id: item.id,
        media_url: `/storage/trip-files/${item.name}`,
        filename: item.name,
        media_type: item.file_type as TripMediaItem['media_type'],
        metadata: { extracted_events: item.extracted_events },
        created_at: item.created_at,
        source: 'upload' as const,
      })),
    ];

    await cacheEntity({ entityType: 'trip_media', entityId: listKey, tripId, data: items });
    return items;
  } catch {
    const cached = await getCachedEntity({ entityType: 'trip_media', entityId: listKey });
    return (cached?.data as TripMediaItem[] | undefined) ?? [];
  }
};
