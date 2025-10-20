import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

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
  created_at: string;
}

interface UploadMediaRequest {
  file: File;
  media_type: 'image' | 'video' | 'document';
}

export const useTripMedia = (tripId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      const subdir = media_type === 'image' ? 'images' : media_type === 'video' ? 'videos' : 'files';
      const fileName = `${tripId}/${subdir}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('advertiser-assets') // Unified bucket
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('advertiser-assets')
        .getPublicUrl(fileName);

      // Save media record to database
      const { data, error } = await supabase
        .from('trip_media_index')
        .insert({
          trip_id: tripId,
          media_type, // 'image' | 'video' | 'document'
          media_url: publicUrl,
          filename: file.name,
          mime_type: file.type,
          file_size: file.size,
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
            .from('advertiser-assets')
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