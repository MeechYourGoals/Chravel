import React from 'react';
import { Trash2 } from 'lucide-react';
import { TripMediaRenderer } from './TripMediaRenderer';

interface MediaTileProps {
  id: string;
  url: string;
  mimeType: string;
  fileName?: string | null;
  onDelete: (id: string) => void;
}

/**
 * Canonical MediaTile - USED EVERYWHERE
 *
 * Single source of truth for rendering media:
 * - Uses TripMediaRenderer for robust video/image handling
 * - Visible delete button
 */
export function MediaTile({
  id,
  url,
  mimeType,
  fileName,
  onDelete,
}: MediaTileProps) {
  const isVideo = mimeType.startsWith('video/');

  return (
    <div className="relative rounded-xl overflow-hidden bg-neutral-900 group">
      {/* DELETE BUTTON - Always visible, no hidden gestures */}
      <button
        onClick={() => onDelete(id)}
        className="absolute top-2 right-2 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Delete media"
      >
        <Trash2 size={16} />
      </button>

      <TripMediaRenderer
        url={url}
        mimeType={mimeType}
        mode={isVideo ? "full" : "thumbnail"} // Videos get controls (full), images get standard display
        alt={fileName ?? 'Trip media'}
        className={isVideo ? "w-full max-h-[70vh] bg-black object-contain" : "w-full h-auto object-cover"}
      />

      {/* FILE (non-image, non-video fallback handled by TripMediaRenderer but we can add extra context if needed) */}
      {!mimeType.startsWith('video/') && !mimeType.startsWith('image/') && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 backdrop-blur-sm">
           <div className="truncate text-sm text-white">{fileName ?? 'File'}</div>
        </div>
      )}
    </div>
  );
}
