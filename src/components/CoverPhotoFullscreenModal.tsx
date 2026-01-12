import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';
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
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect device capabilities and orientation
  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      const landscape = window.matchMedia('(orientation: landscape)').matches;
      setIsMobile(mobile);
      setIsLandscape(landscape);
      setCanShare(typeof navigator.share === 'function');
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  // Lock body scroll when modal is open (important for PWA/mobile)
  useEffect(() => {
    if (isOpen) {
      const originalStyle = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isOpen]);

  // Reset zoom and position when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle swipe down to close on mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (zoom > 1) return; // Don't close while zoomed
      touchStartY.current = e.touches[0].clientY;
    },
    [zoom],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (zoom > 1) return;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchEndY - touchStartY.current;

      // Swipe down more than 100px to close
      if (deltaY > 100) {
        onClose();
      }
    },
    [zoom, onClose],
  );

  // Handle pinch to zoom
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        // Calculate distance between two touches for pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY,
        );

        // Store initial distance on first two-finger touch
        if (!containerRef.current?.dataset.initialPinchDistance) {
          containerRef.current!.dataset.initialPinchDistance = distance.toString();
          containerRef.current!.dataset.initialZoom = zoom.toString();
          return;
        }

        const initialDistance = parseFloat(containerRef.current.dataset.initialPinchDistance);
        const initialZoom = parseFloat(containerRef.current.dataset.initialZoom || '1');
        const scale = distance / initialDistance;
        const newZoom = Math.min(Math.max(initialZoom * scale, 1), 4);
        setZoom(newZoom);

        // Reset position if zooming back to 1
        if (newZoom <= 1) {
          setPosition({ x: 0, y: 0 });
        }
      }
    },
    [zoom],
  );

  const handleTouchEndPinch = useCallback(() => {
    if (containerRef.current) {
      delete containerRef.current.dataset.initialPinchDistance;
      delete containerRef.current.dataset.initialZoom;
    }
  }, []);

  // Handle pan when zoomed
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      }
    },
    [zoom, position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && zoom > 1) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }
    },
    [isDragging, zoom],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - 0.5, 1);
    setZoom(newZoom);
    if (newZoom <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom]);

  // Download/Share handler - uses native share on mobile when available
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const fileName = `${tripName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-cover-photo.jpg`;

      // On mobile with share support, use native share for better UX
      if (canShare && isMobile) {
        const file = new File([blob], fileName, { type: blob.type });
        try {
          await navigator.share({
            files: [file],
            title: `${tripName} Cover Photo`,
          });
          toast.success('Photo shared successfully');
          return;
        } catch (shareError) {
          // If share fails (user cancelled or not supported), fall back to download
          if ((shareError as Error).name !== 'AbortError') {
            console.log('Share failed, falling back to download');
          }
        }
      }

      // Standard download fallback
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Photo downloaded successfully');
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast.error('Failed to download photo');
    }
  }, [imageSrc, tripName, canShare, isMobile]);

  // Click outside to close (only when not zoomed)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1 && e.target === e.currentTarget) {
        onClose();
      }
    },
    [zoom, onClose],
  );

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="w-screen h-screen max-w-none max-h-none p-0 bg-black border-none overflow-hidden rounded-none"
        style={{
          // Use dynamic viewport units for better mobile browser support
          height: '100dvh',
          width: '100dvw',
          // Handle safe areas for notched devices
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <div
          ref={containerRef}
          className="relative w-full h-full flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchEnd={e => {
            handleTouchEnd(e);
            handleTouchEndPinch();
          }}
          onTouchMove={handleTouchMove}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Header with controls - responsive layout */}
          <div
            className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent ${
              isMobile ? 'p-3' : 'p-4'
            }`}
            style={{
              paddingTop: `calc(env(safe-area-inset-top, 0px) + ${isMobile ? '12px' : '16px'})`,
            }}
          >
            <h3
              className={`text-white font-medium truncate pr-2 ${isMobile ? 'text-sm' : 'text-base'}`}
            >
              Cover Photo
            </h3>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Zoom controls - hidden on very small screens, show on larger mobile */}
              {!isMobile || isLandscape ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                    className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <ZoomOut size={isMobile ? 18 : 20} />
                  </Button>
                  <span className="text-white/70 text-xs min-w-[40px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={zoom >= 4}
                    className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <ZoomIn size={isMobile ? 18 : 20} />
                  </Button>
                </>
              ) : null}

              {/* Download/Share button */}
              <Button
                variant="ghost"
                size={isMobile ? 'icon' : 'sm'}
                onClick={handleDownload}
                className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-auto sm:px-3"
              >
                {canShare && isMobile ? (
                  <Share2 size={isMobile ? 18 : 20} />
                ) : (
                  <>
                    <Download size={isMobile ? 18 : 20} />
                    {!isMobile && <span className="ml-2">Download</span>}
                  </>
                )}
              </Button>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
              >
                <X size={isMobile ? 20 : 24} />
              </Button>
            </div>
          </div>

          {/* Image container - handles orientation */}
          <div
            className={`flex-1 flex items-center justify-center overflow-hidden ${
              zoom <= 1 ? 'cursor-pointer' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onClick={handleBackdropClick}
            style={{
              // Adjust padding based on orientation and device
              paddingTop: isMobile ? '60px' : '72px',
              paddingBottom: isMobile ? '60px' : '72px',
              paddingLeft: isLandscape && isMobile ? '60px' : '16px',
              paddingRight: isLandscape && isMobile ? '60px' : '16px',
            }}
          >
            <img
              src={imageSrc}
              alt="Full size cover photo"
              draggable={false}
              className="select-none rounded-lg shadow-2xl"
              style={{
                maxWidth: zoom <= 1 ? '100%' : 'none',
                maxHeight: zoom <= 1 ? '100%' : 'none',
                width: zoom > 1 ? `${zoom * 100}%` : 'auto',
                height: 'auto',
                objectFit: 'contain',
                transform: zoom > 1 ? `translate(${position.x}px, ${position.y}px)` : 'none',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Footer hint - responsive and orientation aware */}
          <div
            className={`absolute bottom-0 left-0 right-0 text-center bg-gradient-to-t from-black/80 to-transparent ${
              isMobile ? 'p-3' : 'p-4'
            }`}
            style={{
              paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${isMobile ? '12px' : '16px'})`,
            }}
          >
            <p className={`text-white/60 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {isMobile
                ? zoom > 1
                  ? 'Pinch to zoom out • Drag to pan'
                  : 'Swipe down to close • Pinch to zoom'
                : 'Click outside to close • ESC to exit'}
            </p>
            {/* Mobile zoom controls in portrait mode */}
            {isMobile && !isLandscape && (
              <div className="flex items-center justify-center gap-4 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  className="text-white/70 hover:bg-white/20 h-8 px-3"
                >
                  <ZoomOut size={16} className="mr-1" />
                  <span className="text-xs">Zoom Out</span>
                </Button>
                <span className="text-white/50 text-xs">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 4}
                  className="text-white/70 hover:bg-white/20 h-8 px-3"
                >
                  <ZoomIn size={16} className="mr-1" />
                  <span className="text-xs">Zoom In</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
