import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUploadContentType } from '@/utils/mime';
import type { AgendaFile } from '@/types/events';

const MAX_AGENDA_FILES = 5;
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const VALID_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

function getPrefix(eventId: string): string {
  return `${eventId}/agenda-files`;
}

/**
 * Parse the original filename from the storage key format:
 *   {uuid}--{encodeURIComponent(originalName)}
 */
function parseOriginalName(storedName: string): string {
  const idx = storedName.indexOf('--');
  if (idx === -1) return storedName;
  try {
    return decodeURIComponent(storedName.slice(idx + 2));
  } catch {
    return storedName.slice(idx + 2);
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UseEventAgendaFilesOptions {
  eventId: string;
  enabled?: boolean;
}

export function useEventAgendaFiles({ eventId, enabled = true }: UseEventAgendaFilesOptions) {
  const [files, setFiles] = useState<AgendaFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    if (!eventId || !enabled) return;
    setIsLoading(true);
    setLoadError(null);

    const prefix = getPrefix(eventId);
    const { data, error } = await supabase.storage
      .from('trip-media')
      .list(prefix, { sortBy: { column: 'created_at', order: 'asc' } });

    if (error) {
      setLoadError(`Failed to load agenda files: ${error.message}`);
      setIsLoading(false);
      return;
    }

    if (!data) {
      setIsLoading(false);
      return;
    }

    const mapped: AgendaFile[] = data
      .filter(f => f.name !== '.emptyFolderPlaceholder')
      .map(f => {
        const storagePath = `${prefix}/${f.name}`;
        const { data: urlData } = supabase.storage.from('trip-media').getPublicUrl(storagePath);

        return {
          id: f.id ?? f.name,
          name: parseOriginalName(f.name),
          storagePath,
          publicUrl: urlData.publicUrl,
          mimeType:
            ((f.metadata as Record<string, unknown>)?.mimetype as string) ??
            'application/octet-stream',
          size: ((f.metadata as Record<string, unknown>)?.size as number) ?? 0,
          createdAt: f.created_at ?? '',
        };
      });

    setFiles(mapped);
    setIsLoading(false);
  }, [eventId, enabled]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const uploadFiles = useCallback(
    async (newFiles: File[]): Promise<boolean> => {
      setUploadError(null);

      // Check total count
      if (files.length + newFiles.length > MAX_AGENDA_FILES) {
        setUploadError(
          `Maximum ${MAX_AGENDA_FILES} files allowed. You already have ${files.length} file(s).`,
        );
        return false;
      }

      // Validate MIME types and file size
      for (const file of newFiles) {
        const type = getUploadContentType(file);
        if (!VALID_MIME_TYPES.includes(type)) {
          setUploadError(
            `"${file.name}" is not supported. Only images (JPG, PNG, WebP) and PDFs are allowed.`,
          );
          return false;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setUploadError(
            `"${file.name}" is too large (${formatFileSize(file.size)}). Maximum file size is ${MAX_FILE_SIZE_MB}MB.`,
          );
          return false;
        }
      }

      setIsUploading(true);

      const prefix = getPrefix(eventId);
      let hadError = false;

      for (const file of newFiles) {
        const contentType = getUploadContentType(file);
        const sanitizedName = encodeURIComponent(file.name);
        const key = `${prefix}/${crypto.randomUUID()}--${sanitizedName}`;

        const { error } = await supabase.storage
          .from('trip-media')
          .upload(key, file, { contentType, upsert: false });

        if (error) {
          setUploadError(`Failed to upload "${file.name}": ${error.message}`);
          hadError = true;
          break;
        }
      }

      // Refresh file list regardless (some may have succeeded)
      await loadFiles();
      setIsUploading(false);
      return !hadError;
    },
    [eventId, files.length, loadFiles],
  );

  const deleteFile = useCallback(async (storagePath: string) => {
    const { error } = await supabase.storage.from('trip-media').remove([storagePath]);

    if (error) {
      setUploadError(`Failed to delete file: ${error.message}`);
      return;
    }

    setFiles(prev => prev.filter(f => f.storagePath !== storagePath));
  }, []);

  const clearError = useCallback(() => setUploadError(null), []);

  const remainingSlots = MAX_AGENDA_FILES - files.length;
  const canUpload = remainingSlots > 0;

  return {
    files,
    isLoading,
    isUploading,
    uploadError,
    loadError,
    clearError,
    uploadFiles,
    deleteFile,
    maxFiles: MAX_AGENDA_FILES,
    remainingSlots,
    canUpload,
    formatFileSize,
  };
}
