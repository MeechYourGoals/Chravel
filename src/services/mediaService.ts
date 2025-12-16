/**
 * Media Service - Canonical Upload + Delete
 *
 * Provides media upload and management for authenticated users.
 * Handles uploads to Supabase Storage and indexing in trip_media_index table.
 *
 * GUARDRAILS:
 * - Blocks HEIC (browser incompatibility)
 * - Warns on MOV (codec issues)
 * - Enforces MIME type via contentType header
 */

import { supabase } from '@/integrations/supabase/client';
import { getMimeTypeFromFilename } from '@/utils/fileTypes';

export interface TripMedia {
  id: string;
  trip_id: string;
  media_url: string;
  mime_type: string;
  file_name: string | null;
  media_type: 'image' | 'video' | 'document';
  metadata?: Record<string, unknown>;
  created_at: string;
  file_size?: number | null;
}

// Legacy interface for backwards compatibility
export interface MediaItem {
  id: string;
  trip_id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata?: Record<string, unknown>;
  created_at: string;
  file_size?: number | null;
  mime_type?: string | null;
}

export interface UploadMediaRequest {
  tripId: string;
  file: File;
  media_type: 'image' | 'video' | 'document';
}

/**
 * Extract the Storage object path from a `trip-media` URL.
 *
 * Supports:
 * - .../storage/v1/object/public/trip-media/<path>
 * - .../storage/v1/object/sign/trip-media/<path>?token=...
 *
 * This is intentionally exported so UI code can generate signed URLs
 * even if we historically stored a "public" URL in DB.
 */
export function extractTripMediaStoragePath(mediaUrl: string): string | null {
  // Expected patterns:
  // - .../storage/v1/object/public/trip-media/<path>
  // - .../storage/v1/object/sign/trip-media/<path>?token=...
  try {
    const url = new URL(mediaUrl);
    const path = url.pathname;
    const publicPrefix = '/storage/v1/object/public/trip-media/';
    const signedPrefix = '/storage/v1/object/sign/trip-media/';

    if (path.includes(publicPrefix)) {
      const idx = path.indexOf(publicPrefix);
      return decodeURIComponent(path.slice(idx + publicPrefix.length));
    }

    if (path.includes(signedPrefix)) {
      const idx = path.indexOf(signedPrefix);
      return decodeURIComponent(path.slice(idx + signedPrefix.length));
    }
  } catch {
    // If it's not an absolute URL, we can't reliably parse.
  }
  return null;
}

/**
 * Extract `metadata.upload_path` from a `trip_media_index` row's metadata.
 */
export function extractUploadPathFromMetadata(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || metadata === null) return null;
  if (!('upload_path' in metadata)) return null;
  const value = (metadata as Record<string, unknown>).upload_path;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Upload media with strict MIME enforcement + guardrails
 */
export async function uploadTripMedia(
  tripId: string,
  file: File,
  userId: string
): Promise<TripMedia> {
  const mime = file.type || getMimeTypeFromFilename(file.name) || 'application/octet-stream';

  // ---- Guardrails ----
  // Block HEIC (browser incompatibility)
  if (mime === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
    throw new Error('HEIC images are not supported. Please upload JPG or PNG.');
  }

  // Warn on MOV (codec issues)
  if (mime === 'video/quicktime') {
    console.warn(
      '[mediaService] MOV uploaded. Ensure codec is H.264 for browser compatibility.'
    );
  }

  // Determine media type from MIME (not extension)
  let mediaType: 'image' | 'video' | 'document' = 'document';
  if (mime.startsWith('image/')) mediaType = 'image';
  else if (mime.startsWith('video/')) mediaType = 'video';

  const fileExt = file.name.split('.').pop();
  const storagePath = `${tripId}/${crypto.randomUUID()}.${fileExt}`;

  // ---- Upload to Supabase Storage ----
  const { error: uploadError } = await supabase.storage
    .from('trip-media')
    .upload(storagePath, file, {
      contentType: mime, // CRITICAL: iOS Safari requires correct Content-Type
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // ---- Get public URL ----
  const { data } = supabase.storage.from('trip-media').getPublicUrl(storagePath);

  // ---- Insert DB record ----
  const { data: media, error: dbError } = await supabase
    .from('trip_media_index')
    .insert({
      trip_id: tripId,
      media_url: data.publicUrl,
      filename: file.name,
      media_type: mediaType,
      mime_type: mime,
      file_size: file.size,
      metadata: {
        upload_path: storagePath,
        uploaded_by: userId,
        original_name: file.name,
      },
    })
    .select()
    .single();

  if (dbError) throw dbError;

  return {
    id: media.id,
    trip_id: media.trip_id,
    media_url: media.media_url,
    mime_type: media.mime_type ?? mime,
    file_name: media.filename,
    media_type: media.media_type as 'image' | 'video' | 'document',
    metadata: media.metadata as Record<string, unknown>,
    created_at: media.created_at ?? new Date().toISOString(),
    file_size: media.file_size,
  };
}

/**
 * Delete media (DB + Storage)
 */
export async function deleteTripMedia(media: TripMedia): Promise<void> {
  // Step 1: Determine storage path (metadata preferred; URL fallback)
  const storagePath =
    extractUploadPathFromMetadata(media.metadata) ?? extractTripMediaStoragePath(media.media_url);

  // Step 2: Delete from storage FIRST (rule: storage must succeed before DB)
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from('trip-media')
      .remove([storagePath]);
    if (storageError) throw storageError;
  }

  // Step 3: Delete DB row and VERIFY it actually deleted a row (prevents false success under RLS)
  const { data: deleted, error: dbError } = await supabase
    .from('trip_media_index')
    .delete()
    .eq('id', media.id)
    .select('id');

  if (dbError) throw dbError;
  if (!deleted || deleted.length !== 1) {
    throw new Error('Delete failed (not authorized, not found, or already deleted).');
  }
}

/**
 * Legacy mediaService object for backwards compatibility
 */
export const mediaService = {
  /**
   * Upload a media file to Supabase Storage (authenticated mode)
   */
  async uploadMedia(request: UploadMediaRequest): Promise<MediaItem> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const result = await uploadTripMedia(request.tripId, request.file, user.id);

    return {
      id: result.id,
      trip_id: result.trip_id,
      media_url: result.media_url,
      filename: result.file_name ?? request.file.name,
      media_type: result.media_type,
      metadata: result.metadata,
      created_at: result.created_at,
      file_size: result.file_size,
      mime_type: result.mime_type,
    };
  },

  /**
   * Get all media items for a trip
   */
  async getMediaItems(tripId: string): Promise<MediaItem[]> {
    const { data, error } = await supabase
      .from('trip_media_index')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      trip_id: item.trip_id,
      media_url: item.media_url,
      filename: item.filename ?? '',
      media_type: item.media_type as 'image' | 'video' | 'document',
      metadata: item.metadata as Record<string, unknown>,
      created_at: item.created_at ?? '',
      file_size: item.file_size,
      mime_type: item.mime_type,
    }));
  },

  /**
   * Get media items by type
   */
  async getMediaByType(
    tripId: string,
    mediaType: 'image' | 'video' | 'document'
  ): Promise<MediaItem[]> {
    const { data, error } = await supabase
      .from('trip_media_index')
      .select('*')
      .eq('trip_id', tripId)
      .eq('media_type', mediaType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      trip_id: item.trip_id,
      media_url: item.media_url,
      filename: item.filename ?? '',
      media_type: item.media_type as 'image' | 'video' | 'document',
      metadata: item.metadata as Record<string, unknown>,
      created_at: item.created_at ?? '',
      file_size: item.file_size,
      mime_type: item.mime_type,
    }));
  },

  /**
   * Delete a media item by ID
   */
  async deleteMedia(mediaId: string): Promise<void> {
    // Try trip_media_index first
    const { data: mediaItem, error: fetchMediaError } = await supabase
      .from('trip_media_index')
      .select('*')
      .eq('id', mediaId)
      .maybeSingle();

    if (fetchMediaError) throw fetchMediaError;

    if (mediaItem) {
      const tripMedia: TripMedia = {
        id: mediaItem.id,
        trip_id: mediaItem.trip_id,
        media_url: mediaItem.media_url,
        mime_type: mediaItem.mime_type ?? '',
        file_name: mediaItem.filename,
        media_type: mediaItem.media_type as 'image' | 'video' | 'document',
        metadata: mediaItem.metadata as Record<string, unknown>,
        created_at: mediaItem.created_at ?? '',
        file_size: mediaItem.file_size,
      };
      await deleteTripMedia(tripMedia);
      return;
    }

    // Fallback: trip_files (DB-only; no reliable storage path in schema)
    const { data: fileRow, error: fileFetchError } = await supabase
      .from('trip_files')
      .select('id')
      .eq('id', mediaId)
      .maybeSingle();

    if (fileFetchError) throw fileFetchError;
    if (!fileRow) throw new Error('Item not found.');

    const { data: deleted, error: deleteError } = await supabase
      .from('trip_files')
      .delete()
      .eq('id', mediaId)
      .select('id');

    if (deleteError) throw deleteError;
    if (!deleted || deleted.length !== 1) {
      throw new Error('Delete failed (not authorized, not found, or already deleted).');
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
    const { data, error } = await supabase
      .from('trip_media_index')
      .select('media_type, file_size')
      .eq('trip_id', tripId);

    if (error) {
      console.error('[mediaService] Error fetching media stats:', error);
      return { total_items: 0, total_size: 0, by_type: {} };
    }

    const stats = {
      total_items: data.length,
      total_size: data.reduce((sum, item) => sum + (item.file_size || 0), 0),
      by_type: {} as Record<string, number>,
    };

    data.forEach((item) => {
      stats.by_type[item.media_type] = (stats.by_type[item.media_type] || 0) + 1;
    });

    return stats;
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
  },
};
