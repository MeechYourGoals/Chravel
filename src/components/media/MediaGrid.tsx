import React, { useState } from 'react';
import { MediaTile } from './MediaTile';
import { Loader2, X, Download } from 'lucide-react';
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

interface ViewingMedia {
  id: string;
  url: string;
  mimeType: string;
  fileName?: string | null;
}

interface MediaGridProps {
  items: MediaItemData[];
  maxItems?: number;
  uploadQueue?: UploadProgress[];
  onDeleteItem: (id: string) => void;
}

/**
 * MediaViewerModal - Fullscreen media viewer for images and videos
 * 
 * iOS CRITICAL attributes for video:
 * - controls: enables native playback controls
 * - playsInline: prevents fullscreen takeover on iOS
 * - muted: required for autoplay on iOS (user can unmute via controls)
 */
const MediaViewerModal: React.FC<{
  media: ViewingMedia;
  onClose: () => void;
}> = ({ media, onClose }) => {
  const [hasError, setHasError] = useState(false);
  const isVideo = media.mimeType.startsWith('video/');
  const isImage = media.mimeType.startsWith('image/');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors"
        onClick={onClose}
        aria-label="Close viewer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Download button */}
      <a
        href={media.url}
        download={media.fileName || 'media'}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 left-4 z-10 text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors"
        onClick={(e) => e.stopPropagation()}
        aria-label="Download media"
      >
        <Download className="w-6 h-6" />
      </a>

      {/* Error state with download fallback */}
      {hasError && (
        <div className="flex flex-col items-center justify-center p-8">
          <p className="text-white text-lg mb-4">Unable to preview</p>
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-5 h-5" />
            Download instead
          </a>
        </div>
      )}

      {/* Video player */}
      {isVideo && !hasError && (
        <video
          src={media.url}
          controls
          autoPlay
          playsInline
          muted // Required for autoplay on iOS - user can unmute via controls
          controlsList="nodownload"
          preload="metadata"
          className="max-w-full max-h-full"
          style={{
            maxWidth: '95vw',
            maxHeight: '95vh',
            width: 'auto',
            height: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
          onError={() => setHasError(true)}
        />
      )}

      {/* Image viewer */}
      {isImage && !hasError && (
        <img
          src={media.url}
          alt={media.fileName || 'Trip media'}
          className="max-w-full max-h-full object-contain"
          style={{
            maxWidth: '95vw',
            maxHeight: '95vh',
          }}
          onClick={(e) => e.stopPropagation()}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
};

export const MediaGrid = ({
  items,
  maxItems,
  uploadQueue = [],
  onDeleteItem,
}: MediaGridProps) => {
  const [viewingMedia, setViewingMedia] = useState<ViewingMedia | null>(null);
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

  const handleViewMedia = (media: ViewingMedia) => {
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
