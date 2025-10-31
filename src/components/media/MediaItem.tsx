import React from 'react';
import { Video, FileText } from 'lucide-react';

interface MediaItemData {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata: any;
  created_at: string;
  source: 'chat' | 'upload';
}

interface MediaItemProps {
  item: MediaItemData;
}

export const MediaItem = ({ item }: MediaItemProps) => {
  if (item.media_type === 'image') {
    return (
      <div className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
        <img
          src={item.media_url}
          alt={item.filename}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (target.src !== '/placeholder.svg') {
              target.src = '/placeholder.svg';
            }
          }}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
    );
  }

  if (item.media_type === 'video') {
    return (
      <div className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          <video
            src={item.media_url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
            poster={item?.metadata?.poster}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Video className="w-12 h-12 text-white" />
          </div>
        </div>
      </div>
    );
  }

  // Document
  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
      <div className="w-full h-full bg-white/10 flex flex-col items-center justify-center p-4">
        <FileText className="w-8 h-8 text-blue-400" />
        <span className="text-xs text-center mt-2 truncate w-full">{item.filename}</span>
      </div>
    </div>
  );
};
