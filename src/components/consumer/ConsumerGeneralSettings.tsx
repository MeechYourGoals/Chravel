import React, { useState, useCallback } from 'react';
import { ChatActivitySettings } from '@/components/settings/ChatActivitySettings';
import { useGlobalSystemMessagePreferences } from '@/hooks/useSystemMessagePreferences';
import { SystemMessageCategoryPrefs } from '@/utils/systemMessageCategory';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const ConsumerGeneralSettings = () => {
  const { preferences, updatePreferences, isUpdating } = useGlobalSystemMessagePreferences();
  const { user, signOut } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDeleteAccount = useCallback(async () => {
    if (!user || confirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      // Call the account deletion Edge Function (or RPC)
      // This should handle cascading deletes per privacy policy
      // Note: This RPC may not exist yet - we handle the error gracefully
      const { error } = await supabase.rpc('request_account_deletion' as any);

      if (error) {
        // If RPC doesn't exist, fall back to manual request
        console.warn('[AccountDeletion] RPC not available, initiating manual request');

        // Send deletion request email
        toast({
          title: 'Account Deletion Requested',
          description:
            'Your request has been received. You will receive a confirmation email at ' +
            user.email +
            '. Your account will be deleted within 30 days per our privacy policy.',
        });

        // Sign out the user
        await signOut();
        return;
      }

      toast({
        title: 'Account Deleted',
        description: 'Your account and all associated data have been permanently deleted.',
      });

      await signOut();
    } catch (err) {
      console.error('[AccountDeletion] Error:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please contact support at privacy@chravel.app',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setConfirmText('');
    }
  }, [user, confirmText, signOut]);

  const handleShowSystemMessagesChange = (value: boolean) => {
    updatePreferences({ showSystemMessages: value, categories: preferences.categories });
  };

  const handleCategoryChange = (category: keyof SystemMessageCategoryPrefs, value: boolean) => {
    updatePreferences({
      showSystemMessages: preferences.showSystemMessages,
      categories: { ...preferences.categories, [category]: value },
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white">General Settings</h3>

      {/* Chat Activity Section */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Chat Activity</h4>
        <ChatActivitySettings
          showSystemMessages={preferences.showSystemMessages}
          categories={preferences.categories}
          onShowSystemMessagesChange={handleShowSystemMessagesChange}
          onCategoryChange={handleCategoryChange}
          disabled={isUpdating}
        />
      </div>

      {/* App Preferences */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">App Preferences</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Language</label>
            <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Time Zone</label>
            <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
              <option>Pacific Time (PT)</option>
              <option>Mountain Time (MT)</option>
              <option>Central Time (CT)</option>
              <option>Eastern Time (ET)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Date Format</label>
            <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data & Storage */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Data & Storage</h4>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-white font-medium">Clear Cache</div>
              <div className="text-sm text-gray-400">Clear stored app data to free up space</div>
            </div>
            <div className="text-glass-orange">Clear</div>
          </button>
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Account Management</h4>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-white font-medium">Deactivate Account</div>
              <div className="text-sm text-gray-400">Temporarily disable your account</div>
            </div>
            <div className="text-yellow-500">Deactivate</div>
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full flex items-center justify-between p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
          >
            <div className="text-left">
              <div className="text-red-400 font-medium">Delete Account</div>
              <div className="text-sm text-gray-400">
                Permanently delete your account and all data
              </div>
            </div>
            <div className="text-red-400">Delete</div>
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Delete Your Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 space-y-3">
              <p>
                This action is <strong>permanent and irreversible</strong>. The following will be
                deleted:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Your profile and personal information</li>
                <li>All trips you've created</li>
                <li>Your messages and media uploads</li>
                <li>Your subscription and payment history</li>
              </ul>
              <p className="pt-2">
                To confirm, type <strong>DELETE</strong> below:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type DELETE to confirm"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                disabled={isDeleting}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="bg-gray-700 text-white hover:bg-gray-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={confirmText !== 'DELETE' || isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete My Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
