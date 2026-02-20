import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Phone, Building } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTripVariant } from '../../contexts/TripVariantContext';
import { AvatarUpload } from './AvatarUpload';
import { useToast } from '../../hooks/use-toast';

interface ProfileSectionProps {
  userOrganization?: {
    name: string;
  };
}

export const ProfileSection = ({ userOrganization }: ProfileSectionProps) => {
  const { user, updateProfile } = useAuth();
  const { accentColors } = useTripVariant();
  const { toast } = useToast();
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  useEffect(() => {
    setDisplayNameDraft(user?.displayName || '');
  }, [user?.displayName]);

  const handleSaveDisplayName = useCallback(async () => {
    if (!user) return;
    const next = displayNameDraft.trim();
    const current = (user.displayName || '').trim();
    if (next === current) return;

    setSavingDisplayName(true);
    try {
      const { error } = await updateProfile({ display_name: next || null });
      if (error) {
        toast({
          title: 'Error',
          description: error?.message || 'Failed to update display name.',
          variant: 'destructive',
        });
        setDisplayNameDraft(user.displayName || '');
      }
    } finally {
      setSavingDisplayName(false);
    }
  }, [displayNameDraft, toast, updateProfile, user.displayName]);

  const handleToggleShowEmail = useCallback(async () => {
    if (!user) return;
    setUpdatingPrivacy(true);
    try {
      const { error } = await updateProfile({ show_email: !user.showEmail });
      if (error) {
        toast({
          title: 'Error',
          description: error?.message || 'Failed to update privacy setting.',
          variant: 'destructive',
        });
      }
    } finally {
      setUpdatingPrivacy(false);
    }
  }, [toast, updateProfile, user]);

  const handleToggleShowPhone = useCallback(async () => {
    if (!user) return;
    setUpdatingPrivacy(true);
    try {
      const { error } = await updateProfile({ show_phone: !user.showPhone });
      if (error) {
        toast({
          title: 'Error',
          description: error?.message || 'Failed to update privacy setting.',
          variant: 'destructive',
        });
      }
    } finally {
      setUpdatingPrivacy(false);
    }
  }, [toast, updateProfile, user]);

  if (!user) return null;

  const handleAvatarUploadComplete = (_avatarUrl: string) => {
    // Avatar is already updated via updateProfile in AvatarUpload component
    // This callback can be used for additional actions like showing a success toast
  };

  const handleAvatarUploadError = (error: string) => {
    console.error('Avatar upload error:', error);
    // Could show a toast notification here
  };

  return (
    <div className="space-y-3">
      <div className="text-center">
        <AvatarUpload
          currentAvatarUrl={user.avatar}
          displayName={user.displayName}
          size="md"
          onUploadComplete={handleAvatarUploadComplete}
          onUploadError={handleAvatarUploadError}
          className="mb-3"
        />
        <h3 className="text-xl font-semibold text-white mb-2">{user.displayName}</h3>
        <p className="text-gray-400 text-sm">{user.email || user.phone}</p>
        {userOrganization && (
          <div className="mt-2">
            <div
              className={`inline-flex items-center gap-2 bg-${accentColors.primary}/20 px-3 py-1 rounded-full`}
            >
              <Building size={14} className={`text-${accentColors.primary}`} />
              <span className={`text-${accentColors.primary} text-sm font-medium`}>
                {userOrganization.name}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-gray-300 text-sm mb-1.5">Display Name</label>
          <input
            type="text"
            value={displayNameDraft}
            onChange={e => setDisplayNameDraft(e.target.value)}
            onBlur={() => void handleSaveDisplayName()}
            disabled={savingDisplayName}
            className={`w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-${accentColors.primary}`}
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1.5">Contact Method</label>
          <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl">
            {user.email ? (
              <Mail size={16} className="text-gray-400" />
            ) : (
              <Phone size={16} className="text-gray-400" />
            )}
            <span className="text-white">{user.email || user.phone}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div>
              <div className="text-white font-medium">Show Email in Trips</div>
              <div className="text-sm text-gray-400">
                Allow trip members to see your email address
              </div>
            </div>
            <button
              onClick={() => void handleToggleShowEmail()}
              disabled={updatingPrivacy}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                user.showEmail ? `bg-${accentColors.primary}` : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  user.showEmail ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div>
              <div className="text-white font-medium">Show Phone in Trips</div>
              <div className="text-sm text-gray-400">
                Allow trip members to see your phone number
              </div>
            </div>
            <button
              onClick={() => void handleToggleShowPhone()}
              disabled={updatingPrivacy}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                user.showPhone ? `bg-${accentColors.primary}` : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  user.showPhone ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
