import React, { useEffect, useState } from 'react';
import { Camera, ExternalLink, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/hooks/useDemoMode';

interface MediaItem {
  id: string;
  media_url: string;
  filename: string;
  media_type: string;
  metadata: any;
  created_at: string;
  source: 'chat' | 'upload';
}

interface MediaAggregatedPhotosProps {
  tripId: string;
}

export const MediaAggregatedPhotos = ({ tripId }: MediaAggregatedPhotosProps) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDemoMode } = useDemoMode();

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode - show mock data
      setMediaItems([
        {
          id: '1',
          media_url: '/chravel-logo.png',
          filename: 'trip-photo.png',
          media_type: 'image',
          metadata: { source: 'chat' },
          created_at: new Date().toISOString(),
          source: 'chat',
        },
      ]);
      setLoading(false);
      return;
    }

    fetchMediaItems();
  }, [tripId, isDemoMode]);

  const fetchMediaItems = async () => {
    try {
      // Fetch from media index (chat aggregated media)
      const { data: chatMedia, error: chatError } = await supabase
        .from('trip_media_index')
        .select('*')
        .eq('trip_id', tripId)
        .in('media_type', ['image', 'video'])
        .order('created_at', { ascending: false });

      if (chatError) throw chatError;

      // Fetch uploaded photos from trip_files (existing upload system)
      const { data: uploadedFiles, error: fileError } = await supabase
        .from('trip_files')
        .select('*')
        .eq('trip_id', tripId)
        .in('file_type', ['image', 'video'])
        .order('created_at', { ascending: false });

      if (fileError) throw fileError;

      // Combine both sources
      const allMedia: MediaItem[] = [
        ...(chatMedia || []).map(item => ({
          id: item.id,
          media_url: item.media_url,
          filename: item.filename || 'Unknown',
          media_type: item.media_type,
          metadata: item.metadata || {},
          created_at: item.created_at,
          source: 'chat' as const,
        })),
        ...(uploadedFiles || []).map(item => ({
          id: item.id,
          media_url: `/storage/trip-files/${item.name}`, // Adjust path as needed
          filename: item.name,
          media_type: item.file_type,
          metadata: { source: 'upload' },
          created_at: item.created_at,
          source: 'upload' as const,
        })),
      ];

      // Sort by date descending
      allMedia.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setMediaItems(allMedia);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (mediaItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Photos or Videos Yet</h3>
        <p className="text-muted-foreground">
          Photos and videos shared in chat or uploaded to files will appear here automatically
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mediaItems.map(item => (
          <div
            key={item.id}
            className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
          >
            <img
              src={item.media_url}
              alt={item.filename}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                  {item.source === 'chat' ? (
                    <MessageCircle className="w-4 h-4 text-white bg-black/50 rounded p-0.5" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-white bg-black/50 rounded p-0.5" />
                  )}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-medium truncate">{item.filename}</p>
                <p className="text-white/80 text-xs">
                  {item.source === 'chat' ? 'From chat' : 'Uploaded'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
