
import React, { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  timestamp: Date;
  uploadedBy: string;
  caption?: string;
}

export const PhotoAlbum = () => {
  // Mock vacation photos for demo
  const mockPhotos: Photo[] = [
    {
      id: 'photo-1',
      url: '/src/assets/vacation-beach-group.jpg',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      uploadedBy: 'Marcus',
      caption: 'Beach day with the crew! 🏖️'
    },
    {
      id: 'photo-2', 
      url: '/src/assets/vacation-landmark-selfie.jpg',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      uploadedBy: 'Sarah',
      caption: 'Epic group selfie at the landmark!'
    },
    {
      id: 'photo-3',
      url: '/src/assets/vacation-dinner-sunset.jpg',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      uploadedBy: 'Alex',
      caption: 'Sunset dinner vibes ✨'
    }
  ];

  const [photos, setPhotos] = useState<Photo[]>(mockPhotos);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newPhoto: Photo = {
            id: Date.now().toString() + Math.random(),
            url: e.target?.result as string,
            timestamp: new Date(),
            uploadedBy: 'You',
          };
          setPhotos(prev => [newPhoto, ...prev]);
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  return (
    <div className="p-8 min-h-[400px] bg-gray-900">
      {/* Upload Section */}
      <div className="mb-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <button
          onClick={triggerPhotoUpload}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-red-500/25 group border border-red-500/50"
        >
          <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
            <Camera size={24} />
          </div>
          <span className="text-lg font-semibold">Add Photos</span>
        </button>
      </div>

      {/* Photos Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative">
              <div className="aspect-square bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-700 group-hover:shadow-xl group-hover:scale-[1.02] transition-all duration-300">
                <img
                  src={photo.url}
                  alt="Trip photo"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => removePhoto(photo.id)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
              >
                <X size={16} />
              </button>
              <div className="mt-3 px-2">
                <div className="text-sm font-medium text-white">{photo.uploadedBy}</div>
                <div className="text-xs text-gray-400">{photo.timestamp.toLocaleDateString()}</div>
                {photo.caption && (
                  <div className="text-xs text-gray-300 mt-1">{photo.caption}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-red-900/50 to-yellow-900/50 rounded-full flex items-center justify-center border border-red-500/30">
              <Camera size={40} className="text-red-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No photos yet</h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">Start capturing memories from your trip! Upload photos to share with your group.</p>
          <button
            onClick={triggerPhotoUpload}
            className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-2xl transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg border border-gray-700 hover:border-red-500/50 font-medium"
          >
            <Upload size={20} />
            Upload Photos
          </button>
        </div>
      )}
    </div>
  );
};
