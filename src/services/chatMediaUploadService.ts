/**
 * Chat Media Upload Service
 * Handles private bucket uploads with signed URL generation
 */

import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';
import type { RichChatAttachment } from '@/types/chatAttachment';

const BUCKET_NAME = 'chat-media';

/**
 * Generate a UUID for client message ID
 */
export const generateClientMessageId = (): string => crypto.randomUUID();

/**
 * Get image dimensions from a File
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get video dimensions and duration from a File
 */
async function getVideoMetadata(
  file: File,
): Promise<{ width: number; height: number; durationMs: number } | null> {
  return new Promise(resolve => {
    if (!file.type.startsWith('video/')) {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationMs: Math.round(video.duration * 1000),
      });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Compress image before upload
 */
async function compressImage(file: File): Promise<File | Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  try {
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      fileType: file.type as string,
    };
    const compressed = await imageCompression(file, options);
    console.log('[ChatMediaUpload] Image compressed:', {
      original: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      compressed: (compressed.size / 1024 / 1024).toFixed(2) + 'MB',
    });
    return compressed;
  } catch (error) {
    console.warn('[ChatMediaUpload] Compression failed, using original:', error);
    return file;
  }
}

/**
 * Upload a file to the private chat-media bucket
 * @returns RichChatAttachment with storage path (NOT public URL)
 */
export async function uploadToChatMedia(
  file: File,
  tripId: string,
  userId: string,
  clientMessageId: string,
  onProgress?: (progress: number) => void,
): Promise<RichChatAttachment> {
  // Compress images
  let fileToUpload: File | Blob = file;
  if (file.type.startsWith('image/')) {
    fileToUpload = await compressImage(file);
  }

  // Build storage path: <tripId>/<userId>/<clientMessageId>/<filename>
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${tripId}/${userId}/${clientMessageId}/${sanitizedName}`;

  // Get file metadata
  let dimensions: { width?: number; height?: number; durationMs?: number } = {};

  if (file.type.startsWith('image/')) {
    const imgDims = await getImageDimensions(file);
    if (imgDims) {
      dimensions = imgDims;
    }
  } else if (file.type.startsWith('video/')) {
    const videoMeta = await getVideoMetadata(file);
    if (videoMeta) {
      dimensions = videoMeta;
    }
  }

  // Upload to private bucket
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileToUpload, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('[ChatMediaUpload] Upload failed:', error);
    throw error;
  }

  // Call progress callback
  onProgress?.(100);

  // Return attachment metadata (path only, NOT public URL)
  return {
    path: storagePath,
    mime: file.type,
    bytes: fileToUpload instanceof Blob ? fileToUpload.size : file.size,
    width: dimensions.width,
    height: dimensions.height,
    durationMs: dimensions.durationMs,
    originalName: file.name,
  };
}

/**
 * Generate a signed URL for a private chat media file
 * @param path Storage path from RichChatAttachment
 * @param expiresIn Expiration time in seconds (default 1 hour)
 */
export async function getSignedUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, expiresIn);

  if (error) {
    console.error('[ChatMediaUpload] Failed to create signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Batch generate signed URLs for multiple paths
 */
export async function getSignedUrls(
  paths: string[],
  expiresIn: number = 3600,
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  // Create signed URLs in parallel
  const results = await Promise.all(
    paths.map(async path => {
      const url = await getSignedUrl(path, expiresIn);
      return { path, url };
    }),
  );

  for (const { path, url } of results) {
    if (url) {
      urlMap.set(path, url);
    }
  }

  return urlMap;
}

/**
 * Upload multiple files and return attachments
 */
export async function uploadMultipleFiles(
  files: File[],
  tripId: string,
  userId: string,
  clientMessageId: string,
  onProgress?: (fileName: string, progress: number) => void,
): Promise<RichChatAttachment[]> {
  const attachments: RichChatAttachment[] = [];

  for (const file of files) {
    try {
      const attachment = await uploadToChatMedia(file, tripId, userId, clientMessageId, progress =>
        onProgress?.(file.name, progress),
      );
      attachments.push(attachment);
    } catch (error) {
      console.error(`[ChatMediaUpload] Failed to upload ${file.name}:`, error);
      throw error;
    }
  }

  return attachments;
}

/**
 * Determine message type from file MIME type
 */
export function getMessageTypeFromFile(file: File): 'image' | 'video' | 'file' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'file';
}
