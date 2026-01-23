import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Upload, ImageIcon } from 'lucide-react';

// Import all 12 demo WebP images
import cancunSpringBreak from '@/assets/trip-covers/cancun-spring-break.webp';
import tokyoAdventure from '@/assets/trip-covers/tokyo-adventure.webp';
import baliDestinationWedding from '@/assets/trip-covers/bali-destination-wedding.webp';
import nashvilleBachelorette from '@/assets/trip-covers/nashville-bachelorette.webp';
import coachellaFestival from '@/assets/trip-covers/coachella-festival-new.webp';
import dubaiBirthday from '@/assets/trip-covers/dubai-birthday-cameron-knight.webp';
import phoenixGolfOuting from '@/assets/trip-covers/phoenix-golf-outing.webp';
import tulumYogaWellness from '@/assets/trip-covers/tulum-yoga-wellness.webp';
import napaWineGetaway from '@/assets/trip-covers/napa-wine-getaway.webp';
import aspenCorporateSki from '@/assets/trip-covers/aspen-corporate-ski.webp';
import disneyFamilyCruise from '@/assets/trip-covers/disney-family-cruise.webp';
import yellowstoneHikingGroup from '@/assets/trip-covers/yellowstone-hiking-group.webp';

interface ImageMigration {
  id: number;
  name: string;
  sourceUrl: string;
  targetFilename: string;
  status: 'pending' | 'converting' | 'uploading' | 'success' | 'error';
  error?: string;
  resultUrl?: string;
}

const DEMO_IMAGES: Omit<ImageMigration, 'status'>[] = [
  { id: 1, name: 'Cancun Spring Break', sourceUrl: cancunSpringBreak, targetFilename: 'cancun-spring-break.jpg' },
  { id: 2, name: 'Tokyo Adventure', sourceUrl: tokyoAdventure, targetFilename: 'tokyo-adventure.jpg' },
  { id: 3, name: 'Bali Destination Wedding', sourceUrl: baliDestinationWedding, targetFilename: 'bali-destination-wedding.jpg' },
  { id: 4, name: 'Nashville Bachelorette', sourceUrl: nashvilleBachelorette, targetFilename: 'nashville-bachelorette.jpg' },
  { id: 5, name: 'Coachella Festival', sourceUrl: coachellaFestival, targetFilename: 'coachella-festival.jpg' },
  { id: 6, name: 'Dubai Birthday', sourceUrl: dubaiBirthday, targetFilename: 'dubai-birthday.jpg' },
  { id: 7, name: 'Phoenix Golf Outing', sourceUrl: phoenixGolfOuting, targetFilename: 'phoenix-golf-outing.jpg' },
  { id: 8, name: 'Tulum Yoga Wellness', sourceUrl: tulumYogaWellness, targetFilename: 'tulum-yoga-wellness.jpg' },
  { id: 9, name: 'Napa Wine Getaway', sourceUrl: napaWineGetaway, targetFilename: 'napa-wine-getaway.jpg' },
  { id: 10, name: 'Aspen Corporate Ski', sourceUrl: aspenCorporateSki, targetFilename: 'aspen-corporate-ski.jpg' },
  { id: 11, name: 'Disney Family Cruise', sourceUrl: disneyFamilyCruise, targetFilename: 'disney-family-cruise.jpg' },
  { id: 12, name: 'Yellowstone Hiking Group', sourceUrl: yellowstoneHikingGroup, targetFilename: 'yellowstone-hiking-group.jpg' },
];

/**
 * Converts a WebP image URL to a JPEG blob using HTML5 Canvas
 */
const convertWebPToJpeg = (webpUrl: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob returned null'));
          }
        },
        'image/jpeg',
        0.9 // 90% quality
      );
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${webpUrl}`));
    };
    
    img.src = webpUrl;
  });
};

/**
 * Uploads a blob to Supabase Storage
 */
const uploadToStorage = async (blob: Blob, filename: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('trip-media')
    .upload(`demo-covers/${filename}`, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('trip-media')
    .getPublicUrl(`demo-covers/${filename}`);

  return urlData.publicUrl;
};

export default function AdminMigrateDemoImages() {
  const [images, setImages] = useState<ImageMigration[]>(
    DEMO_IMAGES.map((img) => ({ ...img, status: 'pending' as const }))
  );
  const [isMigrating, setIsMigrating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const updateImageStatus = (
    id: number,
    updates: Partial<ImageMigration>
  ) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
    );
  };

  const migrateImage = async (image: ImageMigration): Promise<void> => {
    try {
      // Step 1: Convert WebP to JPEG
      updateImageStatus(image.id, { status: 'converting' });
      const jpegBlob = await convertWebPToJpeg(image.sourceUrl);
      console.log(`[Migration] Converted ${image.name} to JPEG (${(jpegBlob.size / 1024).toFixed(1)}KB)`);

      // Step 2: Upload to Supabase Storage
      updateImageStatus(image.id, { status: 'uploading' });
      const publicUrl = await uploadToStorage(jpegBlob, image.targetFilename);
      console.log(`[Migration] Uploaded ${image.name} to ${publicUrl}`);

      updateImageStatus(image.id, { status: 'success', resultUrl: publicUrl });
      setCompletedCount((c) => c + 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Migration] Failed to migrate ${image.name}:`, error);
      updateImageStatus(image.id, { status: 'error', error: errorMessage });
    }
  };

  const handleMigrateAll = async () => {
    setIsMigrating(true);
    setCompletedCount(0);

    // Reset all to pending
    setImages((prev) =>
      prev.map((img) => ({ ...img, status: 'pending', error: undefined, resultUrl: undefined }))
    );

    // Process sequentially to avoid overwhelming the browser/network
    for (const image of images) {
      await migrateImage(image);
    }

    setIsMigrating(false);
  };

  const successCount = images.filter((img) => img.status === 'success').length;
  const errorCount = images.filter((img) => img.status === 'error').length;
  const allDone = successCount + errorCount === images.length && !isMigrating;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-6 w-6" />
              Demo Image Migration Tool
            </CardTitle>
            <CardDescription>
              Convert WebP demo images to JPG and upload to Supabase Storage for OG preview compatibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {isMigrating
                  ? `Processing... (${completedCount}/${images.length})`
                  : allDone
                  ? `Complete: ${successCount} succeeded, ${errorCount} failed`
                  : `${images.length} images ready to migrate`}
              </div>
              <Button
                onClick={handleMigrateAll}
                disabled={isMigrating}
                size="lg"
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Migrate All Images
                  </>
                )}
              </Button>
            </div>

            {/* Progress bar */}
            {isMigrating && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedCount / images.length) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Image Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={image.sourceUrl}
                      alt={image.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <div className="font-medium">{image.name}</div>
                      <div className="text-xs text-muted-foreground">
                        → demo-covers/{image.targetFilename}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {image.status === 'pending' && (
                      <span className="text-sm text-muted-foreground">Pending</span>
                    )}
                    {image.status === 'converting' && (
                      <span className="text-sm text-primary flex items-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Converting...
                      </span>
                    )}
                    {image.status === 'uploading' && (
                      <span className="text-sm text-accent-foreground flex items-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </span>
                    )}
                    {image.status === 'success' && (
                      <span className="text-sm text-primary flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Done
                      </span>
                    )}
                    {image.status === 'error' && (
                      <span className="text-sm text-destructive flex items-center gap-1" title={image.error}>
                        <XCircle className="h-4 w-4" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {allDone && successCount > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg text-primary">Migration Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Successfully uploaded {successCount} images to Supabase Storage.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Next Steps:</p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Verify images in Supabase Storage dashboard (trip-media/demo-covers/)</li>
                  <li>Let me know migration is complete so I can update edge functions</li>
                  <li>After verification, this page can be removed</li>
                </ol>
              </div>
              <div className="text-xs text-muted-foreground">
                Base URL: https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers/
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
