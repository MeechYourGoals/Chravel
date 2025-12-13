import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscribeToMediaUpdates } from '@/services/chatService';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

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
  const [isDeleting, setIsDeleting] = useState(false);
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

  // Delete media item from trip_media_index
  const deleteMedia = useCallback(
    async (mediaId: string) => {
      if (!tripId) return;

      setIsDeleting(true);
      try {
        // Get media item to find storage path
        const { data: mediaItem, error: fetchError } = await supabase
          .from('trip_media_index')
          .select('*')
          .eq('id', mediaId)
          .single();

        if (fetchError) {
          console.error('[useMediaSync] Error fetching media:', fetchError);
          throw fetchError;
        }

        // Delete from storage if we have the upload path
        if (mediaItem?.metadata && typeof mediaItem.metadata === 'object') {
          const metadata = mediaItem.metadata as Record<string, unknown>;
          if (metadata.upload_path && typeof metadata.upload_path === 'string') {
            const { error: storageError } = await supabase.storage
              .from('trip-media')
              .remove([metadata.upload_path]);
            if (storageError) {
              console.warn('[useMediaSync] Storage delete warning:', storageError);
            }
          }
        }

        // Delete from database
        const { error: deleteError } = await supabase
          .from('trip_media_index')
          .delete()
          .eq('id', mediaId);

        if (deleteError) throw deleteError;

        // Optimistically remove from local state
        setImages((prev) => prev.filter((item) => item.id !== mediaId));
        setVideos((prev) => prev.filter((item) => item.id !== mediaId));

        toast.success('Media deleted');
      } catch (err) {
        console.error('[useMediaSync] Delete error:', err);
        toast.error('Failed to delete media');
        // Refresh to restore consistent state
        await refreshMedia();
      } finally {
        setIsDeleting(false);
      }
    },
    [tripId]
  );

  // Delete file from trip_files
  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!tripId) return;

      setIsDeleting(true);
      try {
        const { error: deleteError } = await supabase
          .from('trip_files')
          .delete()
          .eq('id', fileId);

        if (deleteError) throw deleteError;

        // Optimistically remove from local state
        setFiles((prev) => prev.filter((item) => item.id !== fileId));

        toast.success('File deleted');
      } catch (err) {
        console.error('[useMediaSync] Delete file error:', err);
        toast.error('Failed to delete file');
        await refreshMedia();
      } finally {
        setIsDeleting(false);
      }
    },
    [tripId]
  );

  // Delete link from trip_link_index
  const deleteLink = useCallback(
    async (linkId: string) => {
      if (!tripId) return;

      setIsDeleting(true);
      try {
        const { error: deleteError } = await supabase
          .from('trip_link_index')
          .delete()
          .eq('id', linkId);

        if (deleteError) throw deleteError;

        // Optimistically remove from local state
        setLinks((prev) => prev.filter((item) => item.id !== linkId));

        toast.success('Link deleted');
      } catch (err) {
        console.error('[useMediaSync] Delete link error:', err);
        toast.error('Failed to delete link');
        await refreshMedia();
      } finally {
        setIsDeleting(false);
      }
    },
    [tripId]
  );

  return {
    images,
    videos,
    files,
    links,
    allMedia,
    mediaCounts,
    isLoading,
    isDeleting,
    error,
    refreshMedia,
    deleteMedia,
    deleteFile,
    deleteLink,
  };
}