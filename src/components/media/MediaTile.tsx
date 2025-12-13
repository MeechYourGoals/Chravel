import React, { useState } from 'react';
import { Trash2, FileText, ExternalLink, Play, X, Loader2 } from 'lucide-react';

export type MediaTileType = 'image' | 'video' | 'document' | 'file';

export interface MediaTileProps {
  id: string;
  url: string;
  mimeType: string | null;
  fileName?: string | null;
  mediaType?: MediaTileType;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  /** Show delete confirmation before calling onDelete */
  confirmDelete?: boolean;
}

/**
 * Canonical media tile component for rendering all media types.
 * iOS-safe video rendering with visible delete affordance.
 *
 * Usage:
 * - Renders images, videos, and files based on mimeType
 * - Shows visible trash icon for delete (tap-friendly, 44px minimum)
 * - Videos include controls, playsInline, muted, preload for iOS Safari
 */
export function MediaTile({
  id,
  url,
  mimeType,
  fileName,
  mediaType,
  onDelete,
  isDeleting = false,
  confirmDelete = true,
}: MediaTileProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Determine media type from mimeType (MIME-based, not extension-based)
  const normalizedMimeType = mimeType?.toLowerCase() ?? '';
  const isVideo = normalizedMimeType.startsWith('video/') || mediaType === 'video';
  const isImage = normalizedMimeType.startsWith('image/') || mediaType === 'image';
  const isDocument = !isImage && !isVideo;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      setShowDeleteConfirm(true);
    } else {
      onDelete?.(id);
    }
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(id);
  };

  const handleVideoClick = () => {
    if (isVideo && !videoError) {
      setShowVideoModal(true);
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
    console.error('[MediaTile] Video playback failed:', url);
  };

  return (
    <>
      <div className="relative rounded-xl overflow-hidden bg-neutral-900 group">
        {/* DELETE BUTTON - Visible on hover/touch, 44px minimum touch target */}
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute top-2 right-2 z-10 rounded-full bg-black/70 p-2.5 text-white
                       opacity-0 group-hover:opacity-100 transition-opacity duration-200
                       hover:bg-red-600 active:bg-red-700 focus:opacity-100
                       min-w-[44px] min-h-[44px] flex items-center justify-center
                       touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Delete media"
          >
            {isDeleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
          </button>
        )}

        {/* MEDIA CONTENT */}
        {isVideo && (
          <button
            onClick={handleVideoClick}
            className="relative w-full aspect-square bg-black flex items-center justify-center cursor-pointer"
          >
            {/* Thumbnail video (iOS-safe: muted, playsInline, no autoplay) */}
            <video
              src={url}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              onError={handleVideoError}
            />
            {/* Play button overlay */}
            {!videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                  <Play size={24} className="text-white fill-white" />
                </div>
              </div>
            )}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-red-400 text-sm">Video unavailable</span>
              </div>
            )}
          </button>
        )}

        {isImage && (
          <div className="aspect-square">
            <img
              src={url}
              alt={fileName ?? 'Trip media'}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (target.src !== '/placeholder.svg') {
                  target.src = '/placeholder.svg';
                }
              }}
            />
          </div>
        )}

        {isDocument && (
          <div className="aspect-square flex flex-col items-center justify-center p-4 bg-white/5">
            <FileText className="w-10 h-10 text-blue-400 mb-2" />
            <span className="text-xs text-center text-white truncate w-full px-2">
              {fileName ?? 'File'}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300"
            >
              <ExternalLink size={12} />
              Open
            </a>
          </div>
        )}
      </div>

      {/* VIDEO PLAYER MODAL */}
      {showVideoModal && isVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setShowVideoModal(false)}
        >
          <button
            className="absolute top-4 right-4 z-10 text-white bg-white/20 rounded-full p-2
                       hover:bg-white/30 transition-colors min-w-[44px] min-h-[44px]
                       flex items-center justify-center"
            onClick={() => setShowVideoModal(false)}
            aria-label="Close video"
          >
            <X size={24} />
          </button>
          {/* iOS CRITICAL: Full set of attributes for Safari compatibility */}
          <video
            src={url}
            controls
            autoPlay
            playsInline
            muted
            controlsList="nodownload"
            preload="metadata"
            className="max-w-full max-h-full"
            style={{
              maxWidth: '100vw',
              maxHeight: '100vh',
              width: 'auto',
              height: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            onError={handleVideoError}
          />
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl p-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className="text-white font-semibold">
                Delete {isVideo ? 'video' : isImage ? 'photo' : 'file'}?
              </h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              This will permanently remove &quot;{fileName || 'this item'}&quot; from the trip.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/20 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="bg-red-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-700 transition-colors"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
