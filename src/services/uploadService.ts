import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';
import { getUploadContentType } from '@/utils/mime';
import { FREEMIUM_LIMITS, type FreemiumTier } from '@/utils/featureTiers';

// Generate UUID using crypto API
const uuid = () => crypto.randomUUID();

export type MediaType = 'image' | 'video';
export type FileUpload = File & { mime?: string };

export class StorageQuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageQuotaExceededError';
  }
}

export class MediaCountExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaCountExceededError';
  }
}

/**
 * Resolve the user's freemium tier from their profile.
 * Returns 'free' if lookup fails (safe default — most restrictive).
 */
async function resolveUserTier(userId: string): Promise<FreemiumTier> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_product_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.subscription_status === 'active') {
    if (profile.subscription_product_id?.includes('explorer')) return 'explorer';
    return 'frequent-chraveler';
  }
  return 'free';
}

/**
 * Pre-upload enforcement: checks storage quota (MB) and per-trip media count limits.
 * Throws StorageQuotaExceededError or MediaCountExceededError if limits are exceeded.
 */
async function enforceUploadLimits(
  tripId: string,
  subdir: 'images' | 'videos' | 'files',
  fileSizeBytes: number,
): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return; // auth guard handled elsewhere

  const tier = await resolveUserTier(userId);
  const limits = FREEMIUM_LIMITS[tier];

  // 1. Storage quota check (account-wide MB limit)
  if (limits.storageAccountMB !== -1) {
    const { data: mediaData } = await (supabase as any)
      .from('trip_media_index')
      .select('file_size')
      .eq('uploaded_by', userId);

    const usedBytes = (mediaData ?? []).reduce(
      (sum: number, item: { file_size: number | null }) => sum + (item.file_size ?? 0),
      0,
    );
    const usedMB = usedBytes / (1024 * 1024);
    const fileMB = fileSizeBytes / (1024 * 1024);

    if (usedMB + fileMB > limits.storageAccountMB) {
      throw new StorageQuotaExceededError(
        `Storage quota exceeded. You've used ${Math.round(usedMB)}MB of ${limits.storageAccountMB}MB. Upgrade your plan for more storage.`,
      );
    }
  }

  // 2. Per-trip media count check
  const mediaTypeKey =
    subdir === 'images' ? 'photosPerTrip' : subdir === 'videos' ? 'videosPerTrip' : 'filesPerTrip';
  const countLimit = limits[mediaTypeKey];

  if (countLimit !== -1) {
    const mediaType = subdir === 'images' ? 'image' : subdir === 'videos' ? 'video' : null;

    let count = 0;
    if (mediaType) {
      const { count: mediaCount } = await supabase
        .from('trip_media_index')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', tripId)
        .eq('media_type', mediaType);
      count = mediaCount ?? 0;
    } else {
      // files — count from trip_files table
      const { count: fileCount } = await supabase
        .from('trip_files')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', tripId);
      count = fileCount ?? 0;
    }

    if (count >= countLimit) {
      const typeLabel = subdir === 'images' ? 'photos' : subdir;
      throw new MediaCountExceededError(
        `You've reached the limit of ${countLimit} ${typeLabel} per trip on your current plan. Upgrade for unlimited uploads.`,
      );
    }
  }
}

export async function uploadToStorage(
  file: FileUpload,
  tripId: string,
  subdir: 'images' | 'videos' | 'files',
) {
  // Enforce storage and media count limits before uploading
  await enforceUploadLimits(tripId, subdir, file.size);

  let fileToUpload: File | Blob = file;

  // Compress images before upload
  if (subdir === 'images' && file.type.startsWith('image/') && file.type !== 'image/gif') {
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
      if (import.meta.env.DEV) console.warn('Failed to compress image, uploading original:', error);
      fileToUpload = file;
    }
  }

  const id = uuid();
  const ext = file.name.split('.').pop() ?? 'bin';
  const key = `${tripId}/${subdir}/${id}.${ext}`;

  const contentType = getUploadContentType(file);

  const { data: _data, error } = await supabase.storage
    .from('trip-media')
    .upload(key, fileToUpload, {
      contentType,
      upsert: false,
    });

  if (error) throw error;
  const { data: pub } = supabase.storage.from('trip-media').getPublicUrl(key);
  return { key, publicUrl: pub.publicUrl };
}

export async function insertMediaIndex(params: {
  tripId: string;
  mediaType: MediaType;
  url: string;
  uploadPath?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  messageId?: string;
  uploadedBy?: string;
}) {
  const normalizedMimeType =
    params.mimeType && params.mimeType.length > 0 ? params.mimeType : undefined;
  const { data, error } = await supabase
    .from('trip_media_index')
    .insert({
      trip_id: params.tripId,
      media_type: params.mediaType,
      media_url: params.url,
      filename: params.filename ?? null,
      file_size: params.fileSize ?? null,
      mime_type: normalizedMimeType ?? null,
      message_id: params.messageId ?? null,
      metadata:
        params.uploadedBy || params.uploadPath
          ? {
              ...(params.uploadedBy ? { uploaded_by: params.uploadedBy } : {}),
              ...(params.uploadPath ? { upload_path: params.uploadPath } : {}),
            }
          : null,
      caption: null,
      tags: [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertFileIndex(params: {
  tripId: string;
  name: string;
  fileType: string;
  uploadedBy: string;
}) {
  const { data, error } = await supabase
    .from('trip_files')
    .insert({
      trip_id: params.tripId,
      name: params.name,
      file_type: params.fileType,
      uploaded_by: params.uploadedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
