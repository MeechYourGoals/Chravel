import { useState } from 'react';
import { Play, Trash2 } from 'lucide-react';

interface MediaTileProps {
  id: string;
  url: string;
  mimeType: string;
  fileName?: string | null;
  onDelete: (id: string) => void;
  onView?: (media: { id: string; url: string; mimeType: string; fileName?: string | null }) => void;
}

/**
 * Canonical MediaTile - USED EVERYWHERE
 *
 * Single source of truth for rendering media:
 * - MIME-based rendering (not extension-based)
 * - iOS-safe video attributes (controls, playsInline, muted, preload)
 * - Visible delete button (always accessible, no hidden gestures)
 * - Click-to-view support via onView callback
 */
export function MediaTile({
  id,
  url,
  mimeType,
  fileName,
  onDelete,
  onView,
}: MediaTileProps) {
  const [videoError, setVideoError] = useState(false);
  const isVideo = mimeType.startsWith('video/');
  const isImage = mimeType.startsWith('image/');

  const handleClick = () => {
    if (onView && (isImage || isVideo)) {
      onView({ id, url, mimeType, fileName });
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-neutral-900 group">
      {/* DELETE BUTTON - Always visible, no hidden gestures */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id);
        }}
        className="absolute top-2 right-2 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-red-600 transition-colors"
        aria-label="Delete media"
      >
        <Trash2 size={16} />
      </button>

      {/* VIDEO THUMBNAIL - Click to open modal */}
      {isVideo && (
        <button
          onClick={handleClick}
          className="relative w-full aspect-video bg-black cursor-pointer"
          aria-label="Play video"
        >
          {!videoError ? (
            <video
              src={url}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
              onError={() => setVideoError(true)}
              onLoadedMetadata={(e) => {
                // Seek to first frame to show thumbnail
                const video = e.currentTarget;
                if (video.readyState >= 1) {
                  video.currentTime = 0.1;
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play size={32} className="text-gray-500" />
            </div>
          )}
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 group-hover:bg-white/30 transition-colors">
              <Play size={24} className="text-white drop-shadow-lg" fill="white" />
            </div>
          </div>
        </button>
      )}

      {/* IMAGE - Click to open modal */}
      {isImage && (
        <button
          onClick={handleClick}
          className="w-full cursor-pointer"
          aria-label="View image"
        >
          <img
            src={url}
            alt={fileName ?? 'Trip media'}
            loading="lazy"
            className="w-full h-auto object-cover group-hover:opacity-90 transition-opacity"
          />
        </button>
      )}

      {/* FILE (non-image, non-video) */}
      {!isVideo && !isImage && (
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
