import { supabase } from '@/integrations/supabase/client';
import {
  extractTripMediaStoragePath,
  extractUploadPathFromMetadata,
} from '@/services/mediaService';

type CachedSignedUrl = {
  signedUrl: string;
  expiresAtMs: number;
};

// Small in-memory cache to avoid re-signing the same URL repeatedly during a session.
const signedUrlCache = new Map<string, CachedSignedUrl>();

function isBlobOrDataUrl(url: string): boolean {
  return url.startsWith('blob:') || url.startsWith('data:');
}

function isTripMediaStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/') && url.includes('/trip-media/');
}

export async function resolveTripMediaUrl(params: {
  /**
   * The stored URL (historically often a getPublicUrl() output).
   * May be a signed URL, public URL, or already a blob URL.
   */
  mediaUrl: string;
  /**
   * Metadata from `trip_media_index.metadata` (preferred source for upload_path).
   */
  metadata?: unknown;
  /**
   * Signed URL TTL, seconds.
   * Keep reasonably short; we cache on the client anyway.
   */
  expiresInSeconds?: number;
}): Promise<string> {
  const { mediaUrl, metadata, expiresInSeconds = 60 * 30 } = params;

  if (!mediaUrl) return mediaUrl;
  if (isBlobOrDataUrl(mediaUrl)) return mediaUrl;

  // Only attempt signing for trip-media URLs (or when metadata provides an upload_path).
  const uploadPath =
    extractUploadPathFromMetadata(metadata) ??
    (isTripMediaStorageUrl(mediaUrl) ? extractTripMediaStoragePath(mediaUrl) : null);

  if (!uploadPath) return mediaUrl;

  const cached = signedUrlCache.get(uploadPath);
  const now = Date.now();
  if (cached && cached.expiresAtMs > now + 10_000) {
    return cached.signedUrl;
  }

  const { data, error } = await supabase.storage
    .from('trip-media')
    .createSignedUrl(uploadPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    // Fall back to the stored URL (may still work in public bucket envs).
    return mediaUrl;
  }

  signedUrlCache.set(uploadPath, {
    signedUrl: data.signedUrl,
    // Supabase signed URLs expire server-side; keep a small safety margin client-side.
    expiresAtMs: now + expiresInSeconds * 1000,
  });

  return data.signedUrl;
}
