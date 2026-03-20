import React, { useState } from 'react';
import { Video, FileText, ImageOff } from 'lucide-react';

interface MediaItemMetadata {
  poster?: string;
  tags?: string[];
  ai_tags?: string[];
  description?: string;
  [key: string]: unknown;
}

interface MediaItemData {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata: MediaItemMetadata | null;
  created_at: string;
  source: 'chat' | 'upload';
}

interface MediaItemProps {
  item: MediaItemData;
}

export const MediaItem = ({ item }: MediaItemProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (item.media_type === 'image') {
    return (
      <div
        className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
        role="img"
        aria-label={item.filename || 'Image'}
      >
        {/* Shimmer skeleton shown while image loads */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" />
          </div>
        )}

        {/* Broken image fallback */}
        {imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
            <ImageOff className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">Failed to load</span>
          </div>
        )}

        <img
          src={item.media_url}
          alt={item.filename || 'Trip image'}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    );
  }

  if (item.media_type === 'video') {
    return (
      <div
        className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
        role="img"
        aria-label={item.filename || 'Video'}
      >
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          {/* iOS CRITICAL: playsInline prevents fullscreen takeover */}
          <video
            src={item.media_url}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            poster={item?.metadata?.poster}
            aria-label={item.filename || 'Trip video'}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Video className="w-12 h-12 text-white" aria-hidden="true" />
          </div>
        </div>
      </div>
    );
  }

  // Document
  return (
    <div
      className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
      role="img"
      aria-label={item.filename || 'Document'}
    >
      <div className="w-full h-full bg-white/10 flex flex-col items-center justify-center p-4">
        <FileText className="w-8 h-8 text-blue-400" aria-hidden="true" />
        <span className="text-xs text-center mt-2 truncate w-full">{item.filename}</span>
      </div>
    </div>
  );
};
