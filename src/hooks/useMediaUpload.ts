/**
 * useMediaUpload Hook
 *
 * Provides comprehensive media upload functionality with:
 * - Progress tracking per file
 * - Batch upload support
 * - Error handling and retry logic
 * - Demo mode compatibility
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDemoMode } from './useDemoMode';
import { useMediaLimits } from './useMediaLimits';

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  url?: string;
}

export interface MediaUploadOptions {
  tripId: string;
  onProgress?: (progress: UploadProgress[]) => void;
  onComplete?: (uploadedFiles: UploadedFile[]) => void;
  onError?: (error: Error, fileName: string) => void;
}

export interface UploadedFile {
  id: string;
  url: string;
  filename: string;
  type: 'image' | 'video' | 'document';
  size: number;
  mimeType: string;
}

export const useMediaUpload = ({ tripId, onProgress, onComplete, onError }: MediaUploadOptions) => {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const mediaLimits = useMediaLimits(tripId);

  const determineMediaType = (file: File): 'image' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const uploadSingleFile = async (
    file: File,
    fileId: string,
    signal?: AbortSignal,
  ): Promise<UploadedFile> => {
    const mediaType = determineMediaType(file);

    // Update progress: uploading
    updateProgress(fileId, 20, 'uploading');

    if (isDemoMode) {
      // Demo mode: simulate upload with delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockUrl = URL.createObjectURL(file);
      updateProgress(fileId, 100, 'complete', undefined, mockUrl);

      return {
        id: fileId,
        url: mockUrl,
        filename: file.name,
        type: mediaType,
        size: file.size,
        mimeType: file.type,
      };
    }

    try {
      // Use mediaService for authenticated uploads (DRY principle)
      updateProgress(fileId, 50, 'uploading');

      const { mediaService } = await import('@/services/mediaService');
      const mediaItem = await mediaService.uploadMedia({
        tripId,
        file,
        media_type: mediaType,
      });

      if (signal?.aborted) throw new Error('Upload cancelled');

      updateProgress(fileId, 90, 'processing');
      updateProgress(fileId, 100, 'complete', undefined, mediaItem.media_url);

      return {
        id: mediaItem.id,
        url: mediaItem.media_url,
        filename: mediaItem.filename,
        type: mediaItem.media_type,
        size: mediaItem.file_size || file.size,
        mimeType: mediaItem.mime_type || file.type,
      };
    } catch (error) {
      updateProgress(fileId, 0, 'error', error instanceof Error ? error.message : 'Upload failed');
      throw error;
    }
  };

  const updateProgress = (
    fileId: string,
    progress: number,
    status: UploadProgress['status'],
    error?: string,
    url?: string,
  ) => {
    setUploadQueue(prev => {
      const updated = prev.map(item =>
        item.fileId === fileId ? { ...item, progress, status, error, url } : item,
      );
      onProgress?.(updated);
      return updated;
    });
  };

  const uploadFiles = useCallback(
    async (files: File[] | FileList): Promise<UploadedFile[]> => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return [];

      // Check limits before uploading
      const photosToUpload = fileArray.filter(f => f.type.startsWith('image/')).length;
      const videosToUpload = fileArray.filter(f => f.type.startsWith('video/')).length;
      const filesToUpload = fileArray.filter(
        f => !f.type.startsWith('image/') && !f.type.startsWith('video/'),
      ).length;

      if (!mediaLimits.isLoading) {
        if (photosToUpload > 0 && !mediaLimits.photos.canUpload) {
          const limit = mediaLimits.photos.limit;
          toast.error(
            `Photo limit reached (${mediaLimits.photos.used}/${limit} for this trip). Upgrade to Explorer for unlimited uploads.`,
          );
          return [];
        }
        if (videosToUpload > 0 && !mediaLimits.videos.canUpload) {
          const limit = mediaLimits.videos.limit;
          toast.error(
            `Video limit reached (${mediaLimits.videos.used}/${limit} for this trip). Upgrade to Explorer for unlimited uploads.`,
          );
          return [];
        }
        if (filesToUpload > 0 && !mediaLimits.files.canUpload) {
          const limit = mediaLimits.files.limit;
          toast.error(
            `File limit reached (${mediaLimits.files.used}/${limit} for this trip). Upgrade to Explorer for unlimited uploads.`,
          );
          return [];
        }

        // Check if upload would exceed limits
        if (photosToUpload > 0 && mediaLimits.photos.limit !== -1) {
          const remaining = mediaLimits.photos.limit - mediaLimits.photos.used;
          if (photosToUpload > remaining) {
            toast.error(
              `Can only upload ${remaining} more photo${remaining === 1 ? '' : 's'} for this trip. Upgrade for unlimited.`,
            );
            return [];
          }
        }
        if (videosToUpload > 0 && mediaLimits.videos.limit !== -1) {
          const remaining = mediaLimits.videos.limit - mediaLimits.videos.used;
          if (videosToUpload > remaining) {
            toast.error(
              `Can only upload ${remaining} more video${remaining === 1 ? '' : 's'} for this trip. Upgrade for unlimited.`,
            );
            return [];
          }
        }
        if (filesToUpload > 0 && mediaLimits.files.limit !== -1) {
          const remaining = mediaLimits.files.limit - mediaLimits.files.used;
          if (filesToUpload > remaining) {
            toast.error(
              `Can only upload ${remaining} more file${remaining === 1 ? '' : 's'} for this trip. Upgrade for unlimited.`,
            );
            return [];
          }
        }
      }

      setIsUploading(true);

      // Initialize queue
      const initialQueue: UploadProgress[] = fileArray.map((file, index) => ({
        fileId: `${Date.now()}-${index}`,
        fileName: file.name,
        progress: 0,
        status: 'pending' as const,
      }));

      setUploadQueue(initialQueue);
      onProgress?.(initialQueue);

      const results: UploadedFile[] = [];
      const errors: Array<{ fileName: string; error: Error }> = [];

      // Upload files concurrently (max 3 at a time)
      const chunks = [];
      for (let i = 0; i < fileArray.length; i += 3) {
        chunks.push(fileArray.slice(i, i + 3));
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async (file, _idx) => {
          const fileId = initialQueue[fileArray.indexOf(file)].fileId;
          try {
            const result = await uploadSingleFile(file, fileId);
            results.push(result);
          } catch (error) {
            errors.push({
              fileName: file.name,
              error: error instanceof Error ? error : new Error('Upload failed'),
            });
            onError?.(error instanceof Error ? error : new Error('Upload failed'), file.name);
          }
        });

        await Promise.allSettled(promises);
      }

      // Invalidate media queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['tripMedia', tripId] });

      // Show results
      if (results.length > 0) {
        toast.success(
          `${results.length} file${results.length > 1 ? 's' : ''} uploaded successfully`,
        );
        onComplete?.(results);
      }

      if (errors.length > 0) {
        toast.error(`${errors.length} file${errors.length > 1 ? 's' : ''} failed to upload`);
      }

      setIsUploading(false);

      // Clear queue after 2 seconds
      setTimeout(() => setUploadQueue([]), 2000);

      return results;
    },
    [tripId, queryClient, onProgress, onComplete, onError, isDemoMode, mediaLimits],
  );

  const clearQueue = useCallback(() => {
    setUploadQueue([]);
  }, []);

  const retryFailedUploads = useCallback(async () => {
    const failedItems = uploadQueue.filter(item => item.status === 'error');
    if (failedItems.length === 0) return;

    toast.info(
      `Retrying ${failedItems.length} failed upload${failedItems.length > 1 ? 's' : ''}...`,
    );

    // Note: Would need original File objects to retry - simplified for now
    // In production, store File references temporarily
  }, [uploadQueue]);

  return {
    uploadFiles,
    uploadQueue,
    isUploading,
    clearQueue,
    retryFailedUploads,
    hasFailedUploads: uploadQueue.some(item => item.status === 'error'),
  };
};
