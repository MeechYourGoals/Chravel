import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

interface CoverPhotoCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
}

const COVER_ASPECT_RATIO = 3; // 3:1 ratio for trip header

export const CoverPhotoCropModal = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete
}: CoverPhotoCropModalProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [scale, setScale] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    
    const initialCrop = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 },
        COVER_ASPECT_RATIO,
        naturalWidth,
        naturalHeight
      ),
      naturalWidth,
      naturalHeight
    );
    
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  }, []);

  const updatePreview = useCallback(() => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) return;

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: (completedCrop.x / 100) * image.naturalWidth,
      y: (completedCrop.y / 100) * image.naturalHeight,
      width: (completedCrop.width / 100) * image.naturalWidth,
      height: (completedCrop.height / 100) * image.naturalHeight,
    };

    canvas.width = 600;
    canvas.height = 200;

    ctx.drawImage(
      image,
      pixelCrop.x / scale,
      pixelCrop.y / scale,
      pixelCrop.width / scale,
      pixelCrop.height / scale,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, [completedCrop, scale]);

  React.useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) return;

    setIsProcessing(true);

    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      const pixelCrop = {
        x: (completedCrop.x / 100) * image.naturalWidth,
        y: (completedCrop.y / 100) * image.naturalHeight,
        width: (completedCrop.width / 100) * image.naturalWidth,
        height: (completedCrop.height / 100) * image.naturalHeight,
      };

      // Output at high quality (1200x400 for 3:1 ratio)
      canvas.width = 1200;
      canvas.height = 400;

      ctx.drawImage(
        image,
        pixelCrop.x / scale,
        pixelCrop.y / scale,
        pixelCrop.width / scale,
        pixelCrop.height / scale,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
          }
          setIsProcessing(false);
        },
        'image/jpeg',
        0.9
      );
    } catch (error) {
      console.error('Error cropping image:', error);
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Position Your Cover Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop Area */}
          <div className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
              aspect={COVER_ASPECT_RATIO}
              className="max-h-[400px]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                crossOrigin="anonymous"
                style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
                className="max-w-full max-h-[400px] object-contain"
              />
            </ReactCrop>
          </div>

          {/* Zoom Control */}
          <div className="flex items-center gap-4 px-2">
            <ZoomOut size={18} className="text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn size={18} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-12">{scale.toFixed(1)}x</span>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Preview (how it will appear):</p>
            <div className="bg-muted rounded-lg overflow-hidden">
              <canvas
                ref={previewCanvasRef}
                className="w-full h-auto"
                style={{ aspectRatio: '3/1' }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              <X size={16} className="mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Check size={16} className="mr-2" />
                  Save Position
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
