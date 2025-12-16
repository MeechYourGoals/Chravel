import { Trash2 } from 'lucide-react';
import { useResolvedTripMediaUrl } from '@/hooks/useResolvedTripMediaUrl';
import { TripMediaRenderer } from './TripMediaRenderer';

interface MediaTileProps {
  id: string;
  url: string;
  mimeType: string;
  fileName?: string | null;
  metadata?: unknown;
  onDelete: (id: string) => void;
  onView?: () => void;
}

/**
 * Canonical MediaTile - USED EVERYWHERE
 *
 * Single source of truth for rendering media:
 * - MIME-based rendering (not extension-based)
 * - iOS-safe video attributes (controls, playsInline, muted, preload)
 * - Visible delete button (always accessible, no hidden gestures)
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
  const resolvedUrl = useResolvedTripMediaUrl({ url, metadata });
  const finalUrl = resolvedUrl ?? url;

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-900">
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

      {/* IMAGE/VIDEO - Render as clickable thumbnail; open viewer modal via onView */}
      {(isVideo || isImage) && (
        <div className="w-full h-full" onClick={onView} role="button" tabIndex={0}>
          <TripMediaRenderer
            url={finalUrl}
            mimeType={mimeType}
            alt={fileName ?? 'Trip media'}
            mode="thumbnail"
            className="w-full h-full"
          />
        </div>
      )}

      {/* FILE (non-image, non-video) */}
      {!isVideo && !isImage && (
        <div className="flex h-full items-center justify-between p-4">
          <div className="truncate text-sm text-white">{fileName ?? 'File'}</div>
          <a
            href={finalUrl}
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
