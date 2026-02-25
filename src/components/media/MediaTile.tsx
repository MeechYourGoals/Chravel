import { Trash2 } from 'lucide-react';
import { TripMediaRenderer } from './TripMediaRenderer';

interface MediaTileProps {
  id: string;
  url: string;
  mimeType: string;
  fileName?: string | null;
  metadata?: unknown;
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
 */
export function MediaTile({
  id,
  url,
  mimeType,
  fileName,
  metadata,
  onDelete,
  onView,
}: MediaTileProps) {
  const isVideo = mimeType.startsWith('video/');
  const isImage = mimeType.startsWith('image/');
  const isMedia = isVideo || isImage;

  const handleClick = () => {
    if (onView && isMedia) {
      onView({ id, url, mimeType, fileName });
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-neutral-900 group">
      {/* DELETE BUTTON - Always visible, no hidden gestures */}
      <button
        onClick={e => {
          e.stopPropagation();
          onDelete(id);
        }}
        className="absolute top-2 right-2 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-red-600 transition-colors"
        aria-label="Delete media"
      >
        <Trash2 size={16} />
      </button>

      {/* MEDIA (Image/Video) - Using canonical TripMediaRenderer */}
      {isMedia && (
        <button
          onClick={handleClick}
          className={`w-full cursor-pointer ${isVideo ? 'aspect-video' : ''}`}
          aria-label={isVideo ? 'Play video' : 'View image'}
        >
          <TripMediaRenderer
            url={url}
            mimeType={mimeType}
            mode="thumbnail"
            alt={fileName ?? 'Trip media'}
            className="w-full h-full"
          />
        </button>
      )}

      {/* FILE (non-image, non-video) */}
      {!isMedia && (
        <div className="flex items-center justify-between p-4">
          <div className="truncate text-sm text-white">{fileName ?? 'File'}</div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            Open
          </a>
        </div>
      )}
    </div>
  );
}
