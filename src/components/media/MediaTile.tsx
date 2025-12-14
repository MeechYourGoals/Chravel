import { Trash2 } from 'lucide-react';
import { useResolvedTripMediaUrl } from '@/hooks/useResolvedTripMediaUrl';

interface MediaTileProps {
  id: string;
  url: string;
  mimeType: string;
  fileName?: string | null;
  metadata?: unknown;
  onDelete: (id: string) => void;
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
}: MediaTileProps) {
  const isVideo = mimeType.startsWith('video/');
  const isImage = mimeType.startsWith('image/');
  const resolvedUrl = useResolvedTripMediaUrl({ url, metadata });
  const effectiveUrl = resolvedUrl ?? url;

  return (
    <div className="relative rounded-xl overflow-hidden bg-neutral-900">
      {/* DELETE BUTTON - Always visible, no hidden gestures */}
      <button
        onClick={() => onDelete(id)}
        className="absolute top-2 right-2 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-red-600 transition-colors"
        aria-label="Delete media"
      >
        <Trash2 size={16} />
      </button>

      {/* VIDEO - iOS CRITICAL: controls, playsInline, muted, preload */}
      {isVideo && (
        <video
          controls
          playsInline
          muted
          preload="metadata"
          className="w-full max-h-[70vh] bg-black object-contain"
          onError={(e) => console.error('[MediaTile] Video failed to play', e)}
        >
          <source src={effectiveUrl} type={mimeType} />
          Your browser does not support the video tag.
        </video>
      )}

      {/* IMAGE */}
      {isImage && (
        <img
          src={effectiveUrl}
          alt={fileName ?? 'Trip media'}
          loading="lazy"
          className="w-full h-auto object-cover"
        />
      )}

      {/* FILE (non-image, non-video) */}
      {!isVideo && !isImage && (
        <div className="flex items-center justify-between p-4">
          <div className="truncate text-sm text-white">{fileName ?? 'File'}</div>
          <a
            href={effectiveUrl}
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
