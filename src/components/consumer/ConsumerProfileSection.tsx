
import React from 'react';
import { User, Camera, Upload } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const ConsumerProfileSection = () => {
  const { user, updateProfile } = useAuth();

  // Create mock user for demo mode when no real user is authenticated
  const mockUser = {
    id: 'demo-user-123',
    email: 'demo@example.com',
    displayName: 'Demo User',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'
  };

  const currentUser = user || mockUser;
  const currentUpdateProfile = user ? updateProfile : () => {};

  const handleProfileUpdate = (field: string, value: string) => {
    currentUpdateProfile({ [field]: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
          <User size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">Profile Settings</h3>
          <p className="text-gray-400">Manage your personal profile and preferences</p>
        </div>
      </div>

      {/* Profile Photo */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-lg font-semibold text-white mb-3">Profile Photo</h4>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-full flex items-center justify-center">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={24} className="text-white" />
              )}
            </div>
            <button className="absolute -bottom-2 -right-2 bg-glass-orange hover:bg-glass-orange/80 text-white p-2 rounded-full transition-colors">
              <Camera size={16} />
            </button>
          </div>
          <div>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-lg transition-colors">
              <Upload size={16} />
              Upload Photo
            </button>
            <p className="text-sm text-gray-400 mt-1.5">JPG, PNG or GIF. Max size 5MB.</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-lg font-semibold text-white mb-3">Personal Information</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Display Name</label>
            <input
              type="text"
              value={currentUser.displayName}
              onChange={(e) => handleProfileUpdate('display_name', e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={currentUser.email || ''}
              disabled
              className="w-full bg-gray-700/50 border border-gray-600 text-gray-400 rounded-lg px-4 py-2"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm text-gray-300 mb-1.5">Bio</label>
          <textarea
            placeholder="Tell people a bit about yourself..."
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};
