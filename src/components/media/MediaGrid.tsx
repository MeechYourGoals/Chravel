import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MediaTile } from './MediaTile';
import { MediaViewerModal, type MediaViewerItem } from './MediaViewerModal';
import { Loader2, Camera, RotateCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  url?: string;
}

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
  /** Callback to retry a failed upload */
  onRetryUpload?: (fileId: string) => void;
  /** Infinite scroll: load more when sentinel is visible */
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const MediaGrid = ({
  items,
  maxItems,
  uploadQueue = [],
  onDeleteItem,
  onRetryUpload,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: MediaGridProps) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(-1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: '200px', threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoadingMore]);

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

  // Convert items to MediaViewerItem format for swipe navigation
  const viewerItems: MediaViewerItem[] = useMemo(() => {
    return displayItems
      .filter(item => item.media_type === 'image' || item.media_type === 'video')
      .map(item => ({
        id: item.id,
        url: item.media_url,
        mimeType: getMimeType(item),
        fileName: item.filename,
        metadata: item.metadata,
      }));
  }, [displayItems]);

  const handleViewMedia = (itemId: string) => {
    const index = viewerItems.findIndex(v => v.id === itemId);
    if (index !== -1) {
      setActiveMediaIndex(index);
    }
  };

  return (
    <div className="space-y-4" role="region" aria-label="Media gallery">
      {/* Upload Progress Items */}
      {uploadQueue.length > 0 && (
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          role="list"
          aria-label="Upload progress"
          aria-live="polite"
        >
          {uploadQueue.map(upload => (
            <div
              key={upload.fileId}
              role="listitem"
              className="relative aspect-square rounded-lg bg-background/50 border border-white/10 overflow-hidden"
              aria-label={`${upload.fileName}: ${upload.status === 'uploading' || upload.status === 'processing' ? `${upload.progress}% uploaded` : upload.status}`}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                {upload.status === 'uploading' || upload.status === 'processing' ? (
                  <>
                    <Loader2
                      className="w-8 h-8 text-primary animate-spin mb-2"
                      aria-hidden="true"
                    />
                    <p className="text-xs text-foreground/80 mb-2 truncate w-full">
                      {upload.fileName}
                    </p>
                    <Progress
                      value={upload.progress}
                      className="w-full h-2"
                      aria-label={`Upload progress: ${upload.progress}%`}
                    />
                    <p className="text-xs text-foreground/60 mt-1">{upload.progress}%</p>
                  </>
                ) : upload.status === 'complete' ? (
                  <>
                    <span className="text-green-500 text-2xl mb-2" aria-hidden="true">
                      &#10003;
                    </span>
                    <p className="text-xs text-foreground/80 truncate w-full">{upload.fileName}</p>
                  </>
                ) : upload.status === 'error' ? (
                  <>
                    <span className="text-red-500 text-2xl mb-2" aria-hidden="true">
                      &#10007;
                    </span>
                    <p className="text-xs text-foreground/80 truncate w-full">{upload.fileName}</p>
                    <p className="text-xs text-red-500/80 mt-1">
                      {upload.error || 'Upload failed'}
                    </p>
                    {onRetryUpload && (
                      <button
                        onClick={() => onRetryUpload(upload.fileId)}
                        className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors min-h-[44px] min-w-[44px] justify-center"
                        aria-label={`Retry upload for ${upload.fileName}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        Retry
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state with upload CTA */}
      {displayItems.length === 0 && uploadQueue.length === 0 && (
        <div className="text-center py-12" role="status">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Camera className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No Media Yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Photos, videos, and files shared in chat or uploaded will appear here.
          </p>
        </div>
      )}

      {/* Actual Media Items - Using canonical MediaTile */}
      {displayItems.length > 0 && (
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          role="grid"
          aria-label="Media items"
        >
          {displayItems.map(item => (
            <div key={item.id} role="gridcell">
              <MediaTile
                id={item.id}
                url={item.media_url}
                mimeType={getMimeType(item)}
                fileName={item.filename}
                metadata={item.metadata}
                onDelete={onDeleteItem}
                onView={_media => handleViewMedia(item.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-4" aria-hidden />}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {maxItems && items.length > maxItems && (
        <p className="text-center text-gray-400 text-sm">
          Showing {maxItems} of {items.length} items
        </p>
      )}

      {/* Media Viewer Modal with swipe navigation */}
      {activeMediaIndex >= 0 && viewerItems.length > 0 && (
        <MediaViewerModal
          items={viewerItems}
          initialIndex={activeMediaIndex}
          onClose={() => setActiveMediaIndex(-1)}
          onIndexChange={newIndex => setActiveMediaIndex(newIndex)}
        />
      )}
    </div>
  );
};
