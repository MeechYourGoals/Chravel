/**
 * TripMediaRenderer - Canonical media renderer for iOS compatibility
 *
 * This component provides a single source of truth for rendering videos
 * and images across the app. It includes all iOS-required attributes
 * for reliable playback on Safari, PWA, and Capacitor WebViews.
 *
 * iOS WebKit Requirements:
 * - `playsInline` - Required for inline playback (vs fullscreen takeover)
 * - `muted` - Required for autoplay to work
 * - `controls` - Required for user interaction
 * - `preload="metadata"` - Load poster frame without full download
 */

import React, { useState, useCallback } from 'react';
import { Play, AlertCircle, Download } from 'lucide-react';

interface TripMediaRendererProps {
  /** Full URL to the media file */
  url: string;
  /** MIME type of the media (e.g., 'video/mp4', 'image/jpeg') */
  mimeType: string;
  /** Optional alt text for images */
  alt?: string;
  /** Optional poster image for videos */
  poster?: string;
  /** Display mode: 'thumbnail' for grid items, 'full' for modal/player */
  mode?: 'thumbnail' | 'full';
  /** Custom class names */
  className?: string;
  /** Callback when video/image is clicked */
  onClick?: () => void;
  /** Whether to autoplay video (only works with muted) */
  autoPlay?: boolean;
  /** Optional error callback */
  onError?: (error: React.SyntheticEvent) => void;
}

/**
 * Determines the media category from a MIME type
 */
function getMediaCategory(mimeType: string): 'video' | 'image' | 'document' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}

export const TripMediaRenderer: React.FC<TripMediaRendererProps> = ({
  url,
  mimeType,
  alt = 'Trip media',
  poster,
  mode = 'thumbnail',
  className = '',
  onClick,
  autoPlay = false,
  onError,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const category = getMediaCategory(mimeType);

  const handleError = useCallback((e: React.SyntheticEvent) => {
    console.error('[TripMediaRenderer] Media failed to load:', {
      url,
      mimeType,
      error: e,
    });
    setHasError(true);
    onError?.(e);
  }, [url, mimeType, onError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // Error state with download fallback
  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-black/50 rounded-lg p-4 ${className}`}
        style={{ minHeight: mode === 'thumbnail' ? '100%' : '200px' }}
      >
        <AlertCircle className="w-8 h-8 text-orange-400 mb-2" />
        <p className="text-white/70 text-sm text-center mb-3">
          Unable to preview
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-blue-400 text-sm hover:text-blue-300 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download file
        </a>
      </div>
    );
  }

  // Video rendering with full iOS compatibility
  if (category === 'video') {
    if (mode === 'thumbnail') {
      // Thumbnail mode: show preview with play icon overlay
      return (
        <div
          className={`relative w-full h-full bg-black flex items-center justify-center cursor-pointer ${className}`}
          onClick={onClick}
        >
          <video
            src={url}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            poster={poster}
            onError={handleError}
            onLoadedData={handleLoad}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <Play className="w-8 h-8 text-white drop-shadow-lg" fill="white" />
            </div>
          </div>
        </div>
      );
    }

    // Full mode: playable video with controls
    // iOS CRITICAL ATTRIBUTES:
    // - controls: enables native playback controls
    // - playsInline: prevents fullscreen takeover on iOS
    // - muted: required for autoplay on iOS (can be unmuted by user via controls)
    // - preload="metadata": loads poster frame
    return (
      <video
        src={url}
        controls
        playsInline
        muted={autoPlay} // Muted for autoplay, user can unmute
        autoPlay={autoPlay}
        preload="metadata"
        poster={poster}
        className={`max-w-full max-h-full ${className}`}
        style={{
          backgroundColor: '#000',
          borderRadius: '12px',
        }}
        onError={handleError}
        onLoadedData={handleLoad}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  // Image rendering
  if (category === 'image') {
    return (
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover ${className}`}
        style={{
          borderRadius: mode === 'full' ? '12px' : undefined,
        }}
        onClick={onClick}
        onError={handleError}
        onLoad={handleLoad}
      />
    );
  }

  // Document fallback: download link
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors ${className}`}
    >
      <Download className="w-4 h-4" />
      Download file
    </a>
  );
};

/**
 * VideoPlayerModal - Fullscreen video player with iOS compatibility
 *
 * Use this component for modal video playback. It includes all
 * necessary iOS attributes and proper event handling.
 */
interface VideoPlayerModalProps {
  /** Video URL */
  url: string;
  /** MIME type (defaults to video/mp4) */
  mimeType?: string;
  /** Callback to close the modal */
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  url,
  mimeType = 'video/mp4',
  onClose,
}) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 z-10 text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors"
        onClick={onClose}
        aria-label="Close video"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {hasError ? (
        <div className="flex flex-col items-center justify-center p-8">
          <AlertCircle className="w-12 h-12 text-orange-400 mb-4" />
          <p className="text-white text-lg mb-4">Unable to play video</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-5 h-5" />
            Download instead
          </a>
        </div>
      ) : (
        <video
          src={url}
          controls
          autoPlay
          playsInline
          muted // Required for autoplay on iOS - user can unmute
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
    </div>
  );
};

/**
 * MediaViewerModal - Unified fullscreen viewer for images AND videos
 *
 * Single source of truth for viewing media in a modal across the app.
 * Handles both images and videos with proper iOS compatibility.
 */
export interface MediaViewerItem {
  url: string;
  mimeType: string;
  fileName?: string | null;
}

interface MediaViewerModalProps {
  /** Media item to display */
  media: MediaViewerItem;
  /** Callback to close the modal */
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  media,
  onClose,
}) => {
  const [hasError, setHasError] = useState(false);
  const category = getMediaCategory(media.mimeType);

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
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
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
          <AlertCircle className="w-12 h-12 text-orange-400 mb-4" />
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

      {/* Video player - iOS CRITICAL: muted required for autoplay */}
      {category === 'video' && !hasError && (
        <video
          src={media.url}
          controls
          autoPlay
          playsInline
          muted
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
      {category === 'image' && !hasError && (
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

export default TripMediaRenderer;
