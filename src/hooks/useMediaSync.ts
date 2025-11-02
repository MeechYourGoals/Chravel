import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscribeToMediaUpdates } from '@/services/chatService';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];
type MediaRow = Tables['trip_media_index']['Row'];
type FileRow = Tables['trip_files']['Row'];
type LinkRow = Tables['trip_link_index']['Row'];

export function useMediaSync(tripId: string) {
  const [images, setImages] = useState<MediaRow[]>([]);
  const [videos, setVideos] = useState<MediaRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    let subscription: any;

    async function loadInitialData() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch all media types in parallel
        const [mediaResult, filesResult, linksResult] = await Promise.all([
          supabase
            .from('trip_media_index')
            .select('*')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false }),
          supabase
            .from('trip_files')
            .select('*')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false }),
          supabase
            .from('trip_link_index')
            .select('*')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false }),
        ]);

        if (mediaResult.error) throw mediaResult.error;
        if (filesResult.error) throw filesResult.error;
        if (linksResult.error) throw linksResult.error;

        // Separate images and videos
        const mediaItems = mediaResult.data || [];
        setImages(mediaItems.filter(item => item.media_type === 'image'));
        setVideos(mediaItems.filter(item => item.media_type === 'video'));
        setFiles(filesResult.data || []);
        setLinks(linksResult.data || []);

        // Subscribe to real-time updates
        subscription = subscribeToMediaUpdates(tripId, {
          onMediaInsert: (row) => {
            if (row.media_type === 'image') {
              setImages(prev => [row, ...prev]);
            } else if (row.media_type === 'video') {
              setVideos(prev => [row, ...prev]);
            }
          },
          onFileInsert: (row) => {
            setFiles(prev => [row, ...prev]);
          },
          onLinkInsert: (row) => {
            setLinks(prev => [row, ...prev]);
          },
        });
      } catch (err: any) {
        console.error('Failed to load media:', err);
        setError(err.message || 'Failed to load media');
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [tripId]);

  // Computed values
  const allMedia = [...images, ...videos];
  const totalCount = images.length + videos.length + files.length + links.length;
  const mediaCounts = {
    all: totalCount,
    photos: images.length,
    videos: videos.length,
    files: files.length,
    links: links.length,
  };

  // Helper function to refresh media
  const refreshMedia = async () => {
    if (!tripId) return;
    
    setIsLoading(true);
    try {
      const [mediaResult, filesResult, linksResult] = await Promise.all([
        supabase
          .from('trip_media_index')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false }),
        supabase
          .from('trip_files')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false }),
        supabase
          .from('trip_link_index')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false }),
      ]);

      if (mediaResult.data) {
        const mediaItems = mediaResult.data;
        setImages(mediaItems.filter(item => item.media_type === 'image'));
        setVideos(mediaItems.filter(item => item.media_type === 'video'));
      }
      if (filesResult.data) setFiles(filesResult.data);
      if (linksResult.data) setLinks(linksResult.data);
    } catch (err) {
      console.error('Failed to refresh media:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    images,
    videos,
    files,
    links,
    allMedia,
    mediaCounts,
    isLoading,
    error,
    refreshMedia,
  };
}