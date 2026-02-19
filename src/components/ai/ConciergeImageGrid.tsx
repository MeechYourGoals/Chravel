/**
 * ConciergeImageGrid - Inline image grid for AI Concierge responses
 *
 * Renders 2–6 thumbnails with attribution. Click opens lightbox with
 * larger image and "View source" link.
 */

import React, { useState, useCallback } from 'react';
import { ExternalLink, X, Loader2 } from 'lucide-react';
import type { ConciergeImage } from '@/services/imageSearchService';

interface ConciergeImageGridProps {
  images: ConciergeImage[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

export const ConciergeImageGrid: React.FC<ConciergeImageGridProps> = ({
  images,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  className = '',
}) => {
  const [lightboxImage, setLightboxImage] = useState<ConciergeImage | null>(null);

  const openLightbox = useCallback((img: ConciergeImage) => {
    setLightboxImage(img);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  if (isLoading && images.length === 0) {
    return (
      <div
        className={`mt-3 flex items-center gap-2 text-sm text-gray-400 ${className}`}
        aria-label="Loading photos"
      >
        <Loader2 size={16} className="animate-spin flex-shrink-0" />
        <span>Loading photos…</span>
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <>
      <div className={`mt-3 space-y-2 ${className}`}>
        <p className="text-xs font-medium text-gray-400">Photos</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <button
              key={`${img.imageUrl}-${idx}`}
              type="button"
              onClick={() => openLightbox(img)}
              className="group relative block rounded-lg overflow-hidden border border-white/10 bg-black/20 hover:border-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label={`View ${img.title}`}
            >
              <img
                src={img.thumbnailUrl}
                alt={img.title}
                className="w-full aspect-square object-cover"
                loading="lazy"
                onError={e => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-gray-300 truncate">{img.sourceDomain}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-500">Images are from the web</p>
        {hasMore && onLoadMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            {isLoading ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>

      {/* Lightbox modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <img
              src={lightboxImage.imageUrl}
              alt={lightboxImage.title}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="mt-2 flex items-center justify-between text-sm text-gray-300">
              <span className="truncate">{lightboxImage.sourceDomain}</span>
              <a
                href={lightboxImage.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                View source
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
