import React, { useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { toast } from 'sonner';

interface CoverPhotoFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  tripName?: string;
}

export const CoverPhotoFullscreenModal = ({
  isOpen,
  onClose,
  imageSrc,
  tripName = 'trip',
}: CoverPhotoFullscreenModalProps) => {
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${tripName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-cover-photo.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      toast.success('Photo downloaded successfully');
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast.error('Failed to download photo');
    }
  }, [imageSrc, tripName]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden">
        <div className="relative w-full h-full flex flex-col">
          {/* Header with controls */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
            <h3 className="text-white font-medium truncate pr-4">Cover Photo</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
              >
                <Download size={18} className="mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X size={20} />
              </Button>
            </div>
          </div>

          {/* Image container */}
          <div
            className="flex-1 flex items-center justify-center p-4 pt-16 cursor-pointer"
            onClick={onClose}
          >
            <img
              src={imageSrc}
              alt="Full size cover photo"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Footer hint */}
          <div className="absolute bottom-0 left-0 right-0 text-center p-4 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white/60 text-sm">Click outside the image or press ESC to close</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
