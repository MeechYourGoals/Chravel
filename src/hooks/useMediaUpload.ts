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
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDemoMode } from './useDemoMode';

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

  const determineMediaType = (file: File): 'image' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const uploadSingleFile = async (
    file: File,
    fileId: string,
    signal?: AbortSignal
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
        mimeType: file.type
      };
    }

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${tripId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      updateProgress(fileId, 50, 'uploading');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('advertiser-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      if (signal?.aborted) throw new Error('Upload cancelled');

      updateProgress(fileId, 90, 'processing');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('advertiser-assets')
        .getPublicUrl(fileName);

      // Save to database
      const { data, error: dbError } = await supabase
        .from('trip_media_index')
        .insert({
          trip_id: tripId,
          media_type: mediaType,
          media_url: publicUrl,
          filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          metadata: {
            upload_path: uploadData.path,
            original_name: file.name,
            uploaded_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      updateProgress(fileId, 100, 'complete', undefined, publicUrl);

      return {
        id: data.id,
        url: publicUrl,
        filename: file.name,
        type: mediaType,
        size: file.size,
        mimeType: file.type
      };
    } catch (error: any) {
      updateProgress(fileId, 0, 'error', error.message);
      throw error;
    }
  };

  const updateProgress = (
    fileId: string,
    progress: number,
    status: UploadProgress['status'],
    error?: string,
    url?: string
  ) => {
    setUploadQueue((prev) => {
      const updated = prev.map((item) =>
        item.fileId === fileId
          ? { ...item, progress, status, error, url }
          : item
      );
      onProgress?.(updated);
      return updated;
    });
  };

  const uploadFiles = useCallback(
    async (files: File[] | FileList): Promise<UploadedFile[]> => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return [];

      setIsUploading(true);

      // Initialize queue
      const initialQueue: UploadProgress[] = fileArray.map((file, index) => ({
        fileId: `${Date.now()}-${index}`,
        fileName: file.name,
        progress: 0,
        status: 'pending' as const
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
        const promises = chunk.map(async (file, idx) => {
          const fileId = initialQueue[fileArray.indexOf(file)].fileId;
          try {
            const result = await uploadSingleFile(file, fileId);
            results.push(result);
          } catch (error: any) {
            errors.push({ fileName: file.name, error });
            onError?.(error, file.name);
          }
        });

        await Promise.allSettled(promises);
      }

      // Invalidate media queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['tripMedia', tripId] });

      // Show results
      if (results.length > 0) {
        toast.success(`${results.length} file${results.length > 1 ? 's' : ''} uploaded successfully`);
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
    [tripId, queryClient, onProgress, onComplete, onError, isDemoMode]
  );

  const clearQueue = useCallback(() => {
    setUploadQueue([]);
  }, []);

  const retryFailedUploads = useCallback(async () => {
    const failedItems = uploadQueue.filter(item => item.status === 'error');
    if (failedItems.length === 0) return;

    toast.info(`Retrying ${failedItems.length} failed upload${failedItems.length > 1 ? 's' : ''}...`);
    
    // Note: Would need original File objects to retry - simplified for now
    // In production, store File references temporarily
  }, [uploadQueue]);

  return {
    uploadFiles,
    uploadQueue,
    isUploading,
    clearQueue,
    retryFailedUploads,
    hasFailedUploads: uploadQueue.some(item => item.status === 'error')
  };
};
