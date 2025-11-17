import React from 'react';
import { MediaItem } from './MediaItem';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { UploadProgress } from '@/hooks/useMediaUpload';

interface MediaItemData {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata: any;
  created_at: string;
  source: 'chat' | 'upload';
}

interface MediaGridProps {
  items: MediaItemData[];
  maxItems?: number;
  uploadQueue?: UploadProgress[];
}

export const MediaGrid = ({ items, maxItems, uploadQueue = [] }: MediaGridProps) => {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  return (
    <div className="space-y-4">
      {/* Upload Progress Items */}
      {uploadQueue.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploadQueue.map((upload) => (
            <div 
              key={upload.fileId}
              className="relative aspect-square rounded-lg bg-background/50 border border-white/10 overflow-hidden"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                {upload.status === 'uploading' || upload.status === 'processing' ? (
                  <>
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    <p className="text-xs text-foreground/80 mb-2 truncate w-full">
                      {upload.fileName}
                    </p>
                    <Progress value={upload.progress} className="w-full h-2" />
                    <p className="text-xs text-foreground/60 mt-1">
                      {upload.progress}%
                    </p>
                  </>
                ) : upload.status === 'complete' ? (
                  <>
                    <span className="text-green-500 text-2xl mb-2">✓</span>
                    <p className="text-xs text-foreground/80 truncate w-full">
                      {upload.fileName}
                    </p>
                  </>
                ) : upload.status === 'error' ? (
                  <>
                    <span className="text-red-500 text-2xl mb-2">✗</span>
                    <p className="text-xs text-foreground/80 truncate w-full">
                      {upload.fileName}
                    </p>
                    <p className="text-xs text-red-500/80 mt-1">
                      {upload.error || 'Upload failed'}
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actual Media Items */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayItems.map((item) => (
          <MediaItem key={item.id} item={item} />
        ))}
      </div>
      
      {maxItems && items.length > maxItems && (
        <p className="text-center text-gray-400 text-sm">
          Showing {maxItems} of {items.length} items
        </p>
      )}
    </div>
  );
};
