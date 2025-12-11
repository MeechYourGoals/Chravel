import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Camera, Check, Crop } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDemoMode } from '../hooks/useDemoMode';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { CoverPhotoCropModal } from './CoverPhotoCropModal';

interface TripCoverPhotoUploadProps {
  tripId: string;
  currentPhoto?: string;
  onPhotoUploaded: (photoUrl: string) => Promise<boolean>;
  className?: string;
}

export const TripCoverPhotoUpload = ({ 
  tripId, 
  currentPhoto, 
  onPhotoUploaded,
  className = "" 
}: TripCoverPhotoUploadProps) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const previewUrl = URL.createObjectURL(file);
    
    setSelectedImageSrc(previewUrl);
    setShowCropModal(true);
  }, []);

  const handleAdjustPosition = useCallback(() => {
    if (currentPhoto) {
      setSelectedImageSrc(currentPhoto);
      setShowCropModal(true);
    }
  }, [currentPhoto]);

  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    setShowCropModal(false);
    setIsUploading(true);

    // Clean up the original preview URL if it was a blob
    if (selectedImageSrc && selectedImageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImageSrc);
    }

    try {
      // Demo mode: use blob URL
      if (isDemoMode || !user) {
        const croppedUrl = URL.createObjectURL(croppedBlob);
        const success = await onPhotoUploaded(croppedUrl);
        if (success) {
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 2000);
        }
        setIsUploading(false);
        return;
      }

      // Authenticated mode: Upload to Supabase Storage
      const croppedFile = new File([croppedBlob], `cover-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', croppedFile);
      formData.append('folder', `trips/${tripId}`);

      const { data, error } = await supabase.functions.invoke('image-upload', {
        body: formData
      });

      if (error) throw error;
      
      if (!data?.url) {
        throw new Error('No URL returned from upload');
      }

      // Add cache-busting param for re-crops
      const finalUrl = `${data.url}?t=${Date.now()}`;
      const success = await onPhotoUploaded(finalUrl);
      if (success) {
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
      setSelectedImageSrc('');
    }
  }, [user, isDemoMode, tripId, onPhotoUploaded, selectedImageSrc]);

  const handleCropCancel = useCallback(() => {
    setShowCropModal(false);
    if (selectedImageSrc && selectedImageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImageSrc);
    }
    setSelectedImageSrc('');
  }, [selectedImageSrc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  return (
    <>
      {currentPhoto ? (
        <div className={`relative group overflow-hidden rounded-2xl ${className}`}>
          <img 
            src={currentPhoto} 
            alt={`Cover photo for trip ${tripId}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-3">
            <button
              onClick={handleAdjustPosition}
              disabled={isUploading}
              className="cursor-pointer bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-2 flex items-center gap-2 text-white hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <Crop size={16} />
              <span className="text-sm font-medium">Adjust Position</span>
            </button>
            <div
              {...getRootProps()}
              className="cursor-pointer bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-2 flex items-center gap-2 text-white hover:bg-white/30 transition-colors"
            >
              <input {...getInputProps()} />
              <Camera size={16} />
              <span className="text-sm font-medium">Change Photo</span>
            </div>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
              <div className="text-white text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
                <span className="text-sm">Uploading...</span>
              </div>
            </div>
          )}
          {uploadSuccess && (
            <div className="absolute inset-0 bg-green-500/60 rounded-2xl flex items-center justify-center">
              <div className="text-white text-center">
                <Check size={32} className="mx-auto mb-2" />
                <span className="text-sm font-medium">Photo Updated!</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed border-white/30 rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-white/50 hover:bg-white/5 min-h-[192px] ${isDragActive ? 'border-blue-400 bg-blue-400/10' : ''} ${className}`}
        >
          <input {...getInputProps()} />
          <div className="text-white">
            <Upload size={48} className="mx-auto mb-4 text-white/70" />
            <h3 className="text-lg font-semibold mb-2">Upload Trip Cover Photo</h3>
            <p className="text-gray-300 text-sm mb-4">
              {isDragActive 
                ? "Drop your photo here..." 
                : "Drag & drop a photo here, or click to browse"
              }
            </p>
            <p className="text-gray-400 text-xs">
              Supports PNG, JPG, GIF • Max 10MB
            </p>
            {!user && (
              <p className="text-yellow-400 text-xs mt-2">
                Demo mode: Photos will be shown temporarily. Sign in for full functionality.
              </p>
            )}
          </div>
          {isUploading && (
            <div className="mt-4">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-sm text-white">Uploading...</span>
            </div>
          )}
        </div>
      )}

      {/* Crop Modal */}
      {selectedImageSrc && (
        <CoverPhotoCropModal
          isOpen={showCropModal}
          onClose={handleCropCancel}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
};
