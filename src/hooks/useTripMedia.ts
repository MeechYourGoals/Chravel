import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useEffect } from 'react';

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

    console.log('[useTripMedia] Setting up real-time subscription for', tripId);

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
          console.log('[useTripMedia] New media uploaded:', payload.new);
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
          event: 'DELETE',
          schema: 'public',
          table: 'trip_media_index',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('[useTripMedia] Media deleted:', payload.old);
          queryClient.invalidateQueries({ queryKey: ['tripMedia', tripId] });
        }
      )
      .subscribe((status) => {
        console.log('[useTripMedia] Subscription status:', status);
      });

    return () => {
      console.log('[useTripMedia] Cleaning up subscription');
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Upload media mutation
  const uploadMediaMutation = useMutation({
    mutationFn: async ({ file, media_type }: UploadMediaRequest) => {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${tripId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trip-media')
        .upload(fileName, file);

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
          mime_type: file.type,
          file_size: file.size,
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
      // Get media info first
      const { data: mediaItem } = await supabase
        .from('trip_media_index')
        .select('*')
        .eq('id', mediaId)
        .single();

      if (mediaItem?.metadata && typeof mediaItem.metadata === 'object') {
        const metadata = mediaItem.metadata as any;
        if (metadata.upload_path) {
          // Delete from storage
          await supabase.storage
            .from('trip-media')
            .remove([metadata.upload_path]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('trip_media_index')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;
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