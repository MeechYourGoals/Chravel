
import React, { useState, useRef, useEffect } from 'react';
import { User, Camera, Upload, Loader2, Phone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';

export const ConsumerProfileSection = () => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for form fields
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize state when user loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Create mock user for demo mode when no real user is authenticated
  const mockUser = {
    id: 'demo-user-123',
    email: 'demo@example.com',
    displayName: 'Demo User',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'
  };

  const currentUser = user || mockUser;

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Update profile with display_name and bio
      const { error } = await updateProfile({
        display_name: displayName,
        bio: bio
      });

      if (error) throw error;

      // Update phone separately via direct Supabase call
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ phone })
          .eq('user_id', user.id);
      }

      toast({
        title: "Profile updated",
        description: "Your profile changes have been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, GIF).",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be less than 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Path must start with user.id for RLS policies to work correctly
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage with upsert to allow overwriting
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL immediately
      const { error: profileError } = await updateProfile({
        avatar_url: publicUrl
      });

      if (profileError) throw profileError;

      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been updated.",
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <h4 className="text-base font-semibold text-white mb-2">Profile Photo</h4>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-full flex items-center justify-center overflow-hidden">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-white" />
              )}
            </div>
            <button
              onClick={triggerFileInput}
              disabled={isUploading || !user}
              className="absolute -bottom-2 -right-2 bg-glass-orange hover:bg-glass-orange/80 text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </button>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
            <button
              onClick={triggerFileInput}
              disabled={isUploading || !user}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload Photo
                </>
              )}
            </button>
            <p className="text-sm text-gray-400 mt-1.5">JPG, PNG or GIF. Max size 5MB.</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <h4 className="text-base font-semibold text-white mb-2">Personal Information</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
              placeholder="Enter your display name"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={currentUser.email || ''}
              disabled
              className="w-full bg-gray-700/50 border border-gray-600 text-gray-400 rounded-lg px-4 py-2 cursor-not-allowed"
            />
          </div>
        </div>
        
        <div className="mt-3">
          <label className="block text-sm text-gray-300 mb-1.5 flex items-center gap-2">
            <Phone size={14} />
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            placeholder="+1 (555) 123-4567"
          />
          <p className="text-xs text-gray-500 mt-1">Used for SMS notifications and trip member contact (if enabled in Privacy settings)</p>
        </div>
        
        <div className="mt-3">
          <label className="block text-sm text-gray-300 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people a bit about yourself..."
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 resize-none"
            rows={3}
          />
        </div>

        {/* Save Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !user}
            className="bg-glass-orange hover:bg-glass-orange/80 text-white font-medium px-6 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
