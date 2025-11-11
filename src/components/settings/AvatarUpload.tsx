/**
 * AvatarUpload Component
 * 
 * Production-ready avatar upload with:
 * - Image cropping with aspect ratio enforcement (1:1)
 * - Client-side compression before upload
 * - Default avatar generation (initials-based SVG)
 * - Supabase Storage integration
 * - Mobile-responsive UI
 * 
 * @see AVATAR_UPLOAD_IMPLEMENTATION.md for full documentation
 */

import React, { useState, useRef, useCallback } from 'react';
import { Camera, X, Loader2, User } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getInitials, generateDefaultAvatar } from '@/utils/avatarUtils';

const ASPECT_RATIO = 1; // 1:1 for avatars
const MIN_DIMENSION = 200; // Minimum 200x200px
const MAX_FILE_SIZE_MB = 5;
const COMPRESSION_QUALITY = 0.8; // 80% quality
const COMPRESSION_MAX_WIDTH = 800;
const COMPRESSION_MAX_HEIGHT = 800;

interface AvatarUploadProps {
  /** Current avatar URL */
  currentAvatarUrl?: string | null;
  /** User's display name for fallback initials */
  displayName?: string;
  /** Size of the avatar display */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Callback when avatar is successfully uploaded */
  onUploadComplete?: (avatarUrl: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Additional className for the container */
  className?: string;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  displayName = 'User',
  size = 'lg',
  onUploadComplete,
  onUploadError,
  className,
}) => {
  const { user, updateProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgSrc, setImgSrc] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  /**
   * Generate default avatar SVG from initials
   */
  const getDefaultAvatar = useCallback(() => {
    if (currentAvatarUrl && currentAvatarUrl.startsWith('data:image/svg+xml')) {
      return currentAvatarUrl;
    }
    return generateDefaultAvatar(displayName);
  }, [currentAvatarUrl, displayName]);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setError(`Image size must be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setError(null);
    
    // Read file and set up for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
      setIsCropping(true);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }, []);

  /**
   * Create initial crop centered on image
   */
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        ASPECT_RATIO,
        naturalWidth,
        naturalHeight
      ),
      naturalWidth,
      naturalHeight
    );
    
    setCrop(crop);
  }, []);

  /**
   * Cancel cropping and reset
   */
  const handleCancelCrop = useCallback(() => {
    setIsCropping(false);
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Compress image before upload
   */
  const compressImage = useCallback(async (file: File): Promise<File> => {
    try {
      const options = {
        maxSizeMB: MAX_FILE_SIZE_MB,
        maxWidthOrHeight: Math.max(COMPRESSION_MAX_WIDTH, COMPRESSION_MAX_HEIGHT),
        useWebWorker: true,
        fileType: file.type,
        initialQuality: COMPRESSION_QUALITY,
      };

      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (err) {
      console.error('Image compression error:', err);
      // Return original file if compression fails
      return file;
    }
  }, []);

  /**
   * Crop and compress image, then upload to Supabase Storage
   */
  const handleSaveCrop = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current || !user) {
      setError('Missing required data for crop');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const image = imgRef.current;
      const canvas = canvasRef.current;
      const crop = completedCrop;

      // Calculate scale factor
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Set canvas dimensions
      const cropWidth = Math.round(crop.width * scaleX);
      const cropHeight = Math.round(crop.height * scaleY);
      
      if (cropWidth < MIN_DIMENSION || cropHeight < MIN_DIMENSION) {
        setError(`Image must be at least ${MIN_DIMENSION}x${MIN_DIMENSION} pixels`);
        setIsUploading(false);
        return;
      }

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Draw cropped image to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      ctx.drawImage(
        image,
        Math.round(crop.x * scaleX),
        Math.round(crop.y * scaleY),
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to blob conversion failed'));
            }
          },
          'image/jpeg',
          COMPRESSION_QUALITY
        );
      });

      // Create File from blob
      const croppedFile = new File([blob], `avatar-${user.id}-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      // Compress the cropped image
      const compressedFile = await compressImage(croppedFile);

      // Upload to Supabase Storage
      // Note: Path should start with user.id (not 'avatars/') since we're already using .from('avatars')
      // Storage policies require the first path segment to match auth.uid()
      const fileExt = compressedFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Update profile in database
      await updateProfile({ avatar_url: urlData.publicUrl });

      // Call success callback
      onUploadComplete?.(urlData.publicUrl);

      // Reset cropping state
      handleCancelCrop();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(errorMessage);
      onUploadError?.(errorMessage);
      console.error('Avatar upload error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [completedCrop, user, updateProfile, compressImage, onUploadComplete, onUploadError, handleCancelCrop]);

  /**
   * Use default avatar (initials-based SVG)
   */
  const handleUseDefault = useCallback(async () => {
    if (!user) return;

    setIsUploading(true);
    setError(null);

    try {
      const defaultAvatarUrl = generateDefaultAvatar(displayName);
      
      // Update profile with default avatar
      await updateProfile({ avatar_url: defaultAvatarUrl });
      
      onUploadComplete?.(defaultAvatarUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set default avatar';
      setError(errorMessage);
      onUploadError?.(errorMessage);
      console.error('Default avatar error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [user, displayName, updateProfile, onUploadComplete, onUploadError]);

  const avatarUrl = currentAvatarUrl || getDefaultAvatar();
  const initials = getInitials(displayName);

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Avatar Display */}
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], 'border-2 border-border')}>
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-muted text-muted-foreground text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Upload Overlay */}
        {!isCropping && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
            aria-label="Change avatar"
          >
            <Camera className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-destructive text-center max-w-xs">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      {!isCropping ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full sm:w-auto"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Change Photo
              </>
            )}
          </Button>
          
          {!currentAvatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUseDefault}
              disabled={isUploading}
              className="w-full sm:w-auto"
            >
              <User className="w-4 h-4 mr-2" />
              Use Default
            </Button>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          {/* Crop Preview */}
          <div className="relative w-full max-w-md mx-auto">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={ASPECT_RATIO}
              minWidth={MIN_DIMENSION}
              minHeight={MIN_DIMENSION}
            >
              <img
                ref={imgRef}
                alt="Crop preview"
                src={imgSrc}
                onLoad={onImageLoad}
                className="max-w-full"
                style={{ maxHeight: '400px' }}
              />
            </ReactCrop>
          </div>

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Crop Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelCrop}
              disabled={isUploading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveCrop}
              disabled={isUploading || !completedCrop}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Avatar'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload avatar image"
      />
    </div>
  );
};
