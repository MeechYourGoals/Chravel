import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { mediaService } from '@/services/mediaService';
import { getUploadContentType } from '@/utils/mime';

// Initial fetch cap for trip media. Realtime INSERT events are received
// via the subscription below, so recent uploads always appear regardless of cap.
const TRIP_MEDIA_FETCH_LIMIT = 200;

interface TripMedia {
  id: string;
  trip_id: string;
  media_type: string;
  media_url: string;
  filename?: string;
  mime_type?: string;
  file_size?: number;
  message_id?: string;
  metadata?: any;
  caption?: string;
  tags?: string[];
  created_at: string;
}

interface UploadMediaRequest {
  file: File;
  media_type: 'photo' | 'video' | 'document';
}

export const useTripMedia = (tripId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Real-time subscription for media (authenticated mode only)
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`trip_media:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_media_index',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['tripMedia', tripId] });
          
          const mediaItem = payload.new as TripMedia;
          toast({
            title: 'New Media Uploaded',
            description: `${mediaItem.filename || 'A file'} was added by another user.`,
            duration: 3000
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trip_media_index',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          // Handle media edits (caption, tags, etc.) in realtime
          queryClient.setQueryData<TripMedia[]>(['tripMedia', tripId], (old) => {
            if (!old) return old;
            return old.map(item =>
              item.id === (payload.new as TripMedia).id ? (payload.new as TripMedia) : item
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'trip_media_index',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['tripMedia', tripId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient, toast]);

  // Fetch media from database
  const { data: media = [], isLoading } = useQuery({
    queryKey: ['tripMedia', tripId],
    queryFn: async (): Promise<TripMedia[]> => {
      const { data, error } = await supabase
        .from('trip_media_index')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(TRIP_MEDIA_FETCH_LIMIT);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Upload media mutation
  const uploadMediaMutation = useMutation({
    mutationFn: async ({ file, media_type }: UploadMediaRequest) => {
      let fileToUpload = file;
      
      // Compress images before upload
      if (file.type.startsWith('image/') && file.type !== 'image/gif') {
        try {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: file.type,
          };
          fileToUpload = await imageCompression(file, options);
          if (import.meta.env.DEV) {
            console.log('Image compressed:', {
              original: (file.size / 1024 / 1024).toFixed(2) + 'MB',
              compressed: (fileToUpload.size / 1024 / 1024).toFixed(2) + 'MB',
            });
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Failed to compress image, uploading original:', error);
          }
          fileToUpload = file;
        }
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${tripId}/${Date.now()}.${fileExt}`;
      const contentType = getUploadContentType(file);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trip-media')
        .upload(fileName, fileToUpload, {
          contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('trip-media')
        .getPublicUrl(fileName);

      // Save media record to database
      const { data, error } = await supabase
        .from('trip_media_index')
        .insert({
          trip_id: tripId,
          media_type,
          media_url: publicUrl,
          filename: file.name,
          mime_type: contentType,
          file_size: fileToUpload.size,
          caption: null,
          tags: [],
          metadata: {
            upload_path: uploadData.path,
            original_name: file.name
          }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripMedia', tripId] });
      toast({
        title: 'Media uploaded',
        description: 'Your file has been uploaded successfully.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to upload media. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      await mediaService.deleteMedia(mediaId);
      return mediaId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripMedia', tripId] });
      toast({
        title: 'Media deleted',
        description: 'The file has been removed.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete media. Please try again.',
        variant: 'destructive'
      });
    }
  });

  return {
    media,
    isLoading,
    uploadMedia: uploadMediaMutation.mutate,
    deleteMedia: deleteMediaMutation.mutate,
    isUploading: uploadMediaMutation.isPending,
    isDeleting: deleteMediaMutation.isPending
  };
};