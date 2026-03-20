import React from 'react';
import { Trash2 } from 'lucide-react';
import { TripMediaRenderer } from './TripMediaRenderer';
import { useResolvedTripMediaUrl } from '@/hooks/useResolvedTripMediaUrl';

interface MediaTileProps {
  id: string;
  url: string;
  mimeType: string;
  fileName?: string | null;
  metadata?: Record<string, unknown> | null;
  onDelete: (id: string) => void;
  onView?: (media: { id: string; url: string; mimeType: string; fileName?: string | null }) => void;
}

/**
 * Canonical MediaTile - USED EVERYWHERE
 *
 * Single source of truth for rendering media tiles in grids.
 * Uses TripMediaRenderer for consistent iOS-safe rendering.
 *
 * Features:
 * - MIME-based rendering via TripMediaRenderer
 * - iOS-safe video attributes (playsInline, muted, preload)
 * - Visible delete button (always accessible, no hidden gestures)
 * - Click-to-view support via onView callback
 * - Minimum 44px touch targets for accessibility
 */
export const MediaTile = React.memo(function MediaTile({
  id,
  url,
  mimeType,
  fileName,
  metadata,
  onDelete,
  onView,
}: MediaTileProps) {
  const resolvedUrl = useResolvedTripMediaUrl({ url, metadata });
  const mediaUrl = resolvedUrl ?? url;
  const isVideo = mimeType.startsWith('video/');
  const isImage = mimeType.startsWith('image/');
  const isMedia = isVideo || isImage;
  const displayName = fileName ?? 'Trip media';

  const handleClick = () => {
    if (onView && isMedia) {
      onView({ id, url: mediaUrl, mimeType, fileName });
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-neutral-900 group">
      {/* DELETE BUTTON - Always visible, min 44px touch target */}
      <button
        onClick={e => {
          e.stopPropagation();
          onDelete(id);
        }}
        className="absolute top-1 right-1 z-10 rounded-full bg-black/70 min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:bg-red-600 transition-colors"
        aria-label={`Delete ${displayName}`}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>

      {/* MEDIA (Image/Video) - Using canonical TripMediaRenderer */}
      {isMedia && (
        <button
          onClick={handleClick}
          className={`w-full cursor-pointer min-h-[44px] ${isVideo ? 'aspect-video' : ''}`}
          aria-label={isVideo ? `Play video: ${displayName}` : `View image: ${displayName}`}
        >
          <TripMediaRenderer
            url={mediaUrl}
            mimeType={mimeType}
            mode="thumbnail"
            alt={displayName}
            className="w-full h-full"
          />
        </button>
      )}

      {/* FILE (non-image, non-video) */}
      {!isMedia && (
        <div className="flex items-center justify-between p-4 min-h-[44px]">
          <div className="truncate text-sm text-white">{displayName}</div>
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 text-sm hover:text-blue-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={`Open file: ${displayName}`}
          >
            Open
          </a>
        </div>
      )}
    </div>
  );
});
