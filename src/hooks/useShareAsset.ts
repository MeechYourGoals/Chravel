import { useState } from 'react';
import { uploadToStorage, insertMediaIndex, insertFileIndex } from '@/services/uploadService';
import { insertLinkIndex } from '@/services/linkService';
import { unifiedMessagingService } from '@/services/unifiedMessagingService';

type ShareKind = 'image' | 'video' | 'file' | 'link';

export function useShareAsset(tripId: string, userId: string, userName: string) {
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function shareFile(kind: ShareKind, file: File) {
    setUploading(true); setError(null);
    try {
      const subdir = kind === 'image' ? 'images' : kind === 'video' ? 'videos' : 'files';
      const { publicUrl } = await uploadToStorage(file as any, tripId, subdir as any);

      if (kind === 'image' || kind === 'video') {
        const mediaRow = await insertMediaIndex({
          tripId,
          mediaType: kind as 'image' | 'video',
          url: publicUrl,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          uploadedBy: userId,
        });
        await unifiedMessagingService.sendMessage({
          content: '',
          tripId,
          userName,
          userId,
          attachments: [{ type: kind, url: publicUrl, name: file.name }],
        });
        return { type: kind, ref: mediaRow } as const;
      }

      const fileRow = await insertFileIndex({
        tripId,
        name: file.name,
        url: publicUrl,
        mime: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        uploadedBy: userId,
      });

      // Also index into media as a 'document' so Media Files tab resolves URL
      await insertMediaIndex({
        tripId,
        mediaType: 'document',
        url: publicUrl,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedBy: userId,
      });

      await unifiedMessagingService.sendMessage({
        content: file.name,
        tripId,
        userName,
        userId,
        attachments: [{ type: 'file', url: publicUrl, name: file.name }],
      });

      return { type: 'file', ref: fileRow } as const;
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed');
      throw e;
    } finally {
      setUploading(false);
    }
  }

  async function shareLink(url: string, og?: { title?: string; image?: string; description?: string; domain?: string }) {
    setUploading(true); setError(null);
    try {
      const linkRow = await insertLinkIndex({
        tripId,
        url,
        ogTitle: og?.title ?? null,
        ogImageUrl: og?.image ?? null,
        ogDescription: og?.description ?? null,
        domain: og?.domain ?? undefined,
      });

      await unifiedMessagingService.sendMessage({
        content: url,
        tripId,
        userName,
        userId,
        attachments: [{ type: 'link', url }],
      });

      return { type: 'link', ref: linkRow } as const;
    } catch (e: any) {
      setError(e?.message ?? 'Link share failed');
      throw e;
    } finally {
      setUploading(false);
    }
  }

  return { shareFile, shareLink, isUploading, error };
}
