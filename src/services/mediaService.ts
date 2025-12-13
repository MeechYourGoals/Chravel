/**
 * Media Service - Authenticated Mode
 * 
 * Provides media upload and management for authenticated users.
 * Handles uploads to Supabase Storage and indexing in trip_media_index table.
 * 
 * PHASE 2: Collaboration Features
 */

import { supabase } from '@/integrations/supabase/client';

export interface MediaItem {
  id: string;
  trip_id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata?: Record<string, any>;
  created_at: string;
  file_size?: number;
  mime_type?: string;
}

export interface UploadMediaRequest {
  tripId: string;
  file: File;
  media_type: 'image' | 'video' | 'document';
}

export const mediaService = {
  /**
   * Upload a media file to Supabase Storage (authenticated mode)
   */
  async uploadMedia(request: UploadMediaRequest): Promise<MediaItem> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { tripId, file, media_type } = request;

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `trip-media/${tripId}/${fileName}`;

      // Upload file to Supabase Storage with explicit contentType
      // CRITICAL: iOS Safari requires correct Content-Type headers to decode video
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trip-media')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trip-media')
        .getPublicUrl(storagePath);

      // Index in database
      const { data: mediaItem, error: indexError } = await supabase
        .from('trip_media_index')
        .insert({
          trip_id: tripId,
          media_url: urlData.publicUrl,
          filename: file.name,
          media_type,
          file_size: file.size,
          mime_type: file.type,
          metadata: {
            uploaded_by: user.id,
            original_filename: file.name
          }
        })
        .select()
        .single();

      if (indexError) throw indexError;
      
      return {
        id: mediaItem.id,
        trip_id: mediaItem.trip_id,
        media_url: mediaItem.media_url,
        filename: mediaItem.filename,
        media_type: mediaItem.media_type as 'image' | 'video' | 'document',
        metadata: mediaItem.metadata as Record<string, any>,
        created_at: mediaItem.created_at,
        file_size: mediaItem.file_size,
        mime_type: mediaItem.mime_type
      };
    } catch (error) {
      console.error('[mediaService] Error uploading media:', error);
      throw error;
    }
  },

  /**
   * Get all media items for a trip
   */
  async getMediaItems(tripId: string): Promise<MediaItem[]> {
    try {
      const { data, error } = await supabase
        .from('trip_media_index')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database rows to MediaItem type
      return (data || []).map(item => ({
        id: item.id,
        trip_id: item.trip_id,
        media_url: item.media_url,
        filename: item.filename,
        media_type: item.media_type as 'image' | 'video' | 'document',
        metadata: item.metadata as Record<string, any>,
        created_at: item.created_at,
        file_size: item.file_size,
        mime_type: item.mime_type
      }));
    } catch (error) {
      console.error('[mediaService] Error fetching media:', error);
      throw error;
    }
  },

  /**
   * Get media items by type
   */
  async getMediaByType(tripId: string, mediaType: 'image' | 'video' | 'document'): Promise<MediaItem[]> {
    try {
      const { data, error } = await supabase
        .from('trip_media_index')
        .select('*')
        .eq('trip_id', tripId)
        .eq('media_type', mediaType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database rows to MediaItem type
      return (data || []).map(item => ({
        id: item.id,
        trip_id: item.trip_id,
        media_url: item.media_url,
        filename: item.filename,
        media_type: item.media_type as 'image' | 'video' | 'document',
        metadata: item.metadata as Record<string, any>,
        created_at: item.created_at,
        file_size: item.file_size,
        mime_type: item.mime_type
      }));
    } catch (error) {
      console.error('[mediaService] Error fetching media by type:', error);
      throw error;
    }
  },

  /**
   * Delete a media item
   */
  async deleteMedia(mediaId: string): Promise<void> {
    try {
      // Get media item to get storage path
      const { data: mediaItem, error: fetchError } = await supabase
        .from('trip_media_index')
        .select('media_url')
        .eq('id', mediaId)
        .single();

      if (fetchError) throw fetchError;

      // Extract storage path from URL
      const urlPath = new URL(mediaItem.media_url).pathname;
      const storagePath = urlPath.split('/storage/v1/object/public/trip-media/')[1];

      // Delete from storage
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('trip-media')
          .remove([storagePath]);

        if (storageError) console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('trip_media_index')
        .delete()
        .eq('id', mediaId);

      if (dbError) throw dbError;
    } catch (error) {
      console.error('[mediaService] Error deleting media:', error);
      throw error;
    }
  },

  /**
   * Get media usage stats for a trip
   */
  async getMediaStats(tripId: string): Promise<{
    total_items: number;
    total_size: number;
    by_type: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('trip_media_index')
        .select('media_type, file_size')
        .eq('trip_id', tripId);

      if (error) throw error;

      const stats = {
        total_items: data.length,
        total_size: data.reduce((sum, item) => sum + (item.file_size || 0), 0),
        by_type: {} as Record<string, number>
      };

      data.forEach(item => {
        stats.by_type[item.media_type] = (stats.by_type[item.media_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('[mediaService] Error fetching media stats:', error);
      return { total_items: 0, total_size: 0, by_type: {} };
    }
  },

  /**
   * Upload multiple media files at once
   */
  async uploadBatch(requests: UploadMediaRequest[]): Promise<MediaItem[]> {
    const results: MediaItem[] = [];
    
    for (const request of requests) {
      try {
        const mediaItem = await this.uploadMedia(request);
        results.push(mediaItem);
      } catch (error) {
        console.error('[mediaService] Error in batch upload:', error);
        // Continue with other uploads even if one fails
      }
    }

    return results;
  }
};
