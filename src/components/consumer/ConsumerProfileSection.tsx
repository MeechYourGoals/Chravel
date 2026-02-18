import React, { useState, useRef, useEffect } from 'react';
import { User, Camera, Upload, Loader2, Phone, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../hooks/useDemoMode';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { getConsistentAvatar } from '../../utils/avatarUtils';

export const ConsumerProfileSection = () => {
  const { user, updateProfile, signOut } = useAuth();
  const { isDemoMode, showDemoContent } = useDemoMode();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for form fields
  const [realName, setRealName] = useState(user?.realName || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize state when user loads
  useEffect(() => {
    if (user) {
      setRealName(user.realName || '');
      setDisplayName(user.displayName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Create mock user for demo mode when no real user is authenticated
  const mockUser = {
    id: 'demo-user-123',
    email: 'demo@example.com',
    displayName: 'Demo User',
    realName: undefined as string | undefined,
    namePreference: 'display' as const,
    avatar: getConsistentAvatar('Demo User'),
  };

  const currentUser = user || mockUser;

  const handleSave = async () => {
    // In demo mode, just show success without making API calls
    if (showDemoContent) {
      toast({
        title: 'Profile updated',
        description: 'Your profile changes have been saved successfully.',
      });
      return;
    }

    if (!user) return;

    setIsSaving(true);
    try {
      // Canonical identity lives in `profiles` (via useAuth.updateProfile upsert).
      const { error } = await updateProfile({
        real_name: realName.trim() || null,
        display_name: displayName.trim() || null,
        phone: phone || null,
      });

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile changes have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      const message = (error as { message?: string })?.message?.includes(
        'Display name can only be changed twice',
      )
        ? 'Display name can only be changed twice every 30 days. Please try again later.'
        : 'Failed to save profile changes. Please try again.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // In demo mode, just show success without uploading
    if (showDemoContent) {
      toast({
        title: 'Photo uploaded',
        description: 'Your profile photo has been updated.',
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, GIF).',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image size must be less than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.includes('.')
        ? file.name.split('.').pop()
        : file.type.split('/')[1] || 'jpg';
      // Path must start with user.id for RLS policies to work correctly
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage with upsert to allow overwriting
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true,
      });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update profile with new avatar URL immediately
      const { error: profileError } = await updateProfile({
        avatar_url: publicUrl,
      });

      if (profileError) throw profileError;

      toast({
        title: 'Photo uploaded',
        description: 'Your profile photo has been updated.',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload profile photo. Please try again.',
        variant: 'destructive',
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
                <img
                  src={currentUser.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={24} className="text-white" />
              )}
            </div>
            <button
              onClick={triggerFileInput}
              disabled={isUploading || (!user && !showDemoContent)}
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
              disabled={isUploading || (!user && !showDemoContent)}
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

      {/* Personal Information - 2x2 grid: Real Name | Email, Display Name | Phone */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <h4 className="text-base font-semibold text-white mb-2">Personal Information</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Real Name</label>
            <input
              type="text"
              value={realName}
              onChange={e => setRealName(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
              placeholder="Enter your real name"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used when you choose to show your real name.
            </p>
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
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
              placeholder="Nickname or role (e.g., Tour Manager, Security)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Can be a nickname or role (e.g., Tour Manager, Security, Photographer).
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5 flex items-center gap-2">
              <Phone size={14} />
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
              placeholder="+1 (555) 123-4567"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for SMS and direct contact if sharing is enabled.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || (!user && !showDemoContent)}
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

      {/* Sign Out Section */}
      {user && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-semibold text-white">Account</h4>
              <p className="text-sm text-gray-400">Signed in as {user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
