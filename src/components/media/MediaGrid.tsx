import React, { useState } from 'react';
import { MediaTile } from './MediaTile';
import { MediaViewerModal, type MediaViewerItem } from './TripMediaRenderer';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { UploadProgress } from '@/hooks/useMediaUpload';

interface MediaItemData {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  mime_type?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  source?: 'chat' | 'upload';
}

interface MediaGridProps {
  items: MediaItemData[];
  maxItems?: number;
  uploadQueue?: UploadProgress[];
  onDeleteItem: (id: string) => void;
}

export const MediaGrid = ({
  items,
  maxItems,
  uploadQueue = [],
  onDeleteItem,
}: MediaGridProps) => {
  const [viewingMedia, setViewingMedia] = useState<MediaViewerItem | null>(null);
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  // Derive MIME type from media_type if not provided
  const getMimeType = (item: MediaItemData): string => {
    if (item.mime_type) return item.mime_type;
    // Fallback based on media_type
    switch (item.media_type) {
      case 'image':
        return 'image/jpeg';
      case 'video':
        return 'video/mp4';
      default:
        return 'application/octet-stream';
    }
  };

  const handleViewMedia = (media: MediaViewerItem) => {
    setViewingMedia(media);
  };

  return (
    <div className="space-y-4">
      {/* Upload Progress Items */}
      {uploadQueue.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploadQueue.map((upload) => (
            <div
              key={upload.fileId}
              className="relative aspect-square rounded-lg bg-background/50 border border-white/10 overflow-hidden"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                {upload.status === 'uploading' || upload.status === 'processing' ? (
                  <>
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    <p className="text-xs text-foreground/80 mb-2 truncate w-full">
                      {upload.fileName}
                    </p>
                    <Progress value={upload.progress} className="w-full h-2" />
                    <p className="text-xs text-foreground/60 mt-1">{upload.progress}%</p>
                  </>
                ) : upload.status === 'complete' ? (
                  <>
                    <span className="text-green-500 text-2xl mb-2">✓</span>
                    <p className="text-xs text-foreground/80 truncate w-full">
                      {upload.fileName}
                    </p>
                  </>
                ) : upload.status === 'error' ? (
                  <>
                    <span className="text-red-500 text-2xl mb-2">✗</span>
                    <p className="text-xs text-foreground/80 truncate w-full">
                      {upload.fileName}
                    </p>
                    <p className="text-xs text-red-500/80 mt-1">
                      {upload.error || 'Upload failed'}
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actual Media Items - Using canonical MediaTile */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayItems.map((item) => (
          <MediaTile
            key={item.id}
            id={item.id}
            url={item.media_url}
            mimeType={getMimeType(item)}
            fileName={item.filename}
            onDelete={onDeleteItem}
            onView={handleViewMedia}
          />
        ))}
      </div>

      {maxItems && items.length > maxItems && (
        <p className="text-center text-gray-400 text-sm">
          Showing {maxItems} of {items.length} items
        </p>
      )}

      {/* Media Viewer Modal */}
      {viewingMedia && (
        <MediaViewerModal
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}
    </div>
  );
};
