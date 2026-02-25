import React from 'react';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlacePhotoGalleryProps {
  photos?: string[];
  placeName: string;
  maxPhotos?: number;
  className?: string;
}

export const PlacePhotoGallery: React.FC<PlacePhotoGalleryProps> = ({
  photos,
  placeName,
  maxPhotos = 3,
  className,
}) => {
  const displayPhotos = photos?.slice(0, maxPhotos) || [];

  if (displayPhotos.length === 0) {
    return (
      <div
        className={cn(
          'w-full h-32 bg-muted rounded-lg flex items-center justify-center',
          className,
        )}
      >
        <Image className="w-8 h-8 text-muted-foreground/40" />
      </div>
    );
  }

  // Single photo layout
  if (displayPhotos.length === 1) {
    return (
      <div className={cn('w-full h-32 rounded-lg overflow-hidden', className)}>
        <OptimizedImage
          src={displayPhotos[0]}
          alt={`${placeName} - Photo 1`}
          className="w-full h-full"
          lazy={true}
        />
      </div>
    );
  }

  // Two photos layout (50/50 split)
  if (displayPhotos.length === 2) {
    return (
      <div className={cn('grid grid-cols-2 gap-1 h-32 rounded-lg overflow-hidden', className)}>
        {displayPhotos.map((photo, idx) => (
          <OptimizedImage
            key={idx}
            src={photo}
            alt={`${placeName} - Photo ${idx + 1}`}
            className="w-full h-full"
            lazy={true}
          />
        ))}
      </div>
    );
  }

  // Three+ photos layout (large left, 2 stacked right)
  return (
    <div className={cn('grid grid-cols-2 gap-1 h-32 rounded-lg overflow-hidden', className)}>
      <OptimizedImage
        src={displayPhotos[0]}
        alt={`${placeName} - Photo 1`}
        className="w-full h-full row-span-2"
        lazy={true}
      />
      <div className="grid grid-rows-2 gap-1">
        <OptimizedImage
          src={displayPhotos[1]}
          alt={`${placeName} - Photo 2`}
          className="w-full h-full"
          lazy={true}
        />
        <OptimizedImage
          src={displayPhotos[2]}
          alt={`${placeName} - Photo 3`}
          className="w-full h-full"
          lazy={true}
        />
      </div>
    </div>
  );
};
