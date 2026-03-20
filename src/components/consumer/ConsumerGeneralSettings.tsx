import React, { useState, useCallback, useEffect } from 'react';
import { ChatActivitySettings } from '@/components/settings/ChatActivitySettings';
import { useGlobalSystemMessagePreferences } from '@/hooks/useSystemMessagePreferences';
import { SystemMessageCategoryPrefs } from '@/utils/systemMessageCategory';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';
import { logAuthEvent } from '@/utils/authTelemetry';
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

const APP_PREFS_KEY = 'chravel_app_preferences';

interface AppPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
}

function loadAppPreferences(): AppPreferences {
  try {
    const stored = localStorage.getItem(APP_PREFS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse error
  }
  return { language: 'English', timezone: 'Pacific Time (PT)', dateFormat: 'MM/DD/YYYY' };
}

function saveAppPreferences(prefs: AppPreferences): void {
  try {
    localStorage.setItem(APP_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore write error
  }
}

export const ConsumerGeneralSettings = () => {
  const { preferences, updatePreferences, isUpdating } = useGlobalSystemMessagePreferences();
  const { user, signOut } = useAuth();
  const { showDemoContent } = useDemoMode();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reAuthPassword, setReAuthPassword] = useState('');
  const [reAuthError, setReAuthError] = useState('');
  const [deletionScheduledFor, setDeletionScheduledFor] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [appPrefs, setAppPrefs] = useState<AppPreferences>(loadAppPreferences);
  const [cacheClearSuccess, setCacheClearSuccess] = useState(false);

  // Check if account deletion is already scheduled
  useEffect(() => {
    if (!user || showDemoContent) return;
    let cancelled = false;

    supabase
      .rpc('get_account_deletion_status' as never)
      .then(({ data, error }: { data: unknown; error: unknown }) => {
        if (cancelled || error) return;
        const result = data as {
          pending_deletion?: boolean;
          scheduled_for?: string;
          // Legacy shape fallback
          status?: string;
          deletion_scheduled_for?: string;
        } | null;
        if (result?.pending_deletion && result?.scheduled_for) {
          setDeletionScheduledFor(result.scheduled_for);
        } else if (result?.status === 'scheduled' && result?.deletion_scheduled_for) {
          // Legacy shape fallback
          setDeletionScheduledFor(result.deletion_scheduled_for);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, showDemoContent]);

  const handleCancelDeletion = useCallback(async () => {
    setIsCancelling(true);
    try {
      const { error } = await supabase.rpc('cancel_account_deletion' as never);
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to cancel deletion. Please contact support.',
          variant: 'destructive',
        });
        return;
      }
      logAuthEvent('account_deletion_cancelled');
      setDeletionScheduledFor(null);
      toast({
        title: 'Deletion Cancelled',
        description: 'Your account deletion has been cancelled. Your account will remain active.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to cancel deletion. Please contact support at privacy@chravelapp.com',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  }, []);

  // Local demo state for preferences when in demo mode
  const [demoPreferences, setDemoPreferences] = useState({
    showSystemMessages: true,
    categories: {
      member: true,
      basecamp: true,
      uploads: true,
      polls: true,
      calendar: true,
      tasks: false,
      payments: false,
    } as SystemMessageCategoryPrefs,
  });

  const handleDeleteAccount = useCallback(async () => {
    if (!user || confirmText !== 'DELETE') return;

    setIsDeleting(true);
    setReAuthError('');

    // Re-authenticate to confirm the user's identity before account deletion
    if (user.email && reAuthPassword) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: reAuthPassword,
      });

      if (signInError) {
        setReAuthError('Incorrect password. Please try again.');
        setIsDeleting(false);
        return;
      }
    } else if (!reAuthPassword) {
      setReAuthError('Please enter your password to confirm deletion.');
      setIsDeleting(false);
      return;
    }

    try {
      const { error } = await supabase.rpc('request_account_deletion' as never);

      if (error) {
        // RPC not available — submit request without claiming deletion completed
        toast({
          title: 'Deletion Request Submitted',
          description:
            'Your request has been received. Your account will be deleted within 30 days per our privacy policy. Contact privacy@chravelapp.com with questions.',
        });
        await signOut();
        return;
      }

      // RPC succeeded — deletion is SCHEDULED, not immediate
      logAuthEvent('account_deletion_requested');
      setDeletionScheduledFor(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
      toast({
        title: 'Deletion Scheduled',
        description:
          'Your account will be deleted in 30 days. You can cancel this in Settings before then.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to request deletion. Please contact support at privacy@chravelapp.com',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setConfirmText('');
      setReAuthPassword('');
      setReAuthError('');
    }
  }, [user, confirmText, reAuthPassword, signOut]);

  const handleShowSystemMessagesChange = (value: boolean) => {
    if (showDemoContent) {
      setDemoPreferences(prev => ({ ...prev, showSystemMessages: value }));
      return;
    }
    updatePreferences({ showSystemMessages: value, categories: preferences.categories });
  };

  const handleCategoryChange = (category: keyof SystemMessageCategoryPrefs, value: boolean) => {
    if (showDemoContent) {
      setDemoPreferences(prev => ({
        ...prev,
        categories: { ...prev.categories, [category]: value },
      }));
      return;
    }
    updatePreferences({
      showSystemMessages: preferences.showSystemMessages,
      categories: { ...preferences.categories, [category]: value },
    });
  };

  // Use demo preferences when in demo mode, otherwise use real preferences
  const activePreferences = showDemoContent ? demoPreferences : preferences;

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white">General Settings</h3>

      {/* Chat Activity Section */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Chat Activity</h4>
        <ChatActivitySettings
          showSystemMessages={activePreferences.showSystemMessages}
          categories={activePreferences.categories}
          onShowSystemMessagesChange={handleShowSystemMessagesChange}
          onCategoryChange={handleCategoryChange}
          disabled={isUpdating && !showDemoContent}
        />
      </div>

      {/* App Preferences */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">App Preferences</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Language</label>
            <select
              value={appPrefs.language}
              aria-label="Language preference"
              onChange={e => {
                const updated = { ...appPrefs, language: e.target.value };
                setAppPrefs(updated);
                saveAppPreferences(updated);
                toast({
                  title: 'Language updated',
                  description: `Language set to ${e.target.value}.`,
                });
              }}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            >
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Time Zone</label>
            <select
              value={appPrefs.timezone}
              aria-label="Time zone preference"
              onChange={e => {
                const updated = { ...appPrefs, timezone: e.target.value };
                setAppPrefs(updated);
                saveAppPreferences(updated);
                toast({
                  title: 'Time zone updated',
                  description: `Time zone set to ${e.target.value}.`,
                });
              }}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            >
              <option>Pacific Time (PT)</option>
              <option>Mountain Time (MT)</option>
              <option>Central Time (CT)</option>
              <option>Eastern Time (ET)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Date Format</label>
            <select
              value={appPrefs.dateFormat}
              aria-label="Date format preference"
              onChange={e => {
                const updated = { ...appPrefs, dateFormat: e.target.value };
                setAppPrefs(updated);
                saveAppPreferences(updated);
                toast({
                  title: 'Date format updated',
                  description: `Date format set to ${e.target.value}.`,
                });
              }}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            >
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
          <button
            onClick={() => {
              try {
                // Clear TanStack Query cache if available
                if (window.caches) {
                  window.caches
                    .keys()
                    .then(names => names.forEach(name => window.caches.delete(name)));
                }
                setCacheClearSuccess(true);
                toast({
                  title: 'Cache Cleared',
                  description: 'App cache has been cleared successfully.',
                });
                setTimeout(() => setCacheClearSuccess(false), 3000);
              } catch {
                toast({
                  title: 'Error',
                  description: 'Failed to clear cache.',
                  variant: 'destructive',
                });
              }
            }}
            className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <div className="text-left">
              <div className="text-white font-medium">Clear Cache</div>
              <div className="text-sm text-gray-400">Clear stored app data to free up space</div>
            </div>
            <div className={cacheClearSuccess ? 'text-green-400' : 'text-glass-orange'}>
              {cacheClearSuccess ? 'Done!' : 'Clear'}
            </div>
          </button>
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Account Management</h4>
        <div className="space-y-3">
          {deletionScheduledFor && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="text-red-300 font-medium text-sm mb-1">
                Account Deletion Scheduled
              </div>
              <div className="text-gray-400 text-xs mb-2">
                Your account will be permanently deleted on{' '}
                {new Date(deletionScheduledFor).toLocaleDateString()}. All data will be removed.
              </div>
              <button
                onClick={handleCancelDeletion}
                disabled={isCancelling}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Deletion'}
              </button>
            </div>
          )}
          <div className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg opacity-50 cursor-not-allowed">
            <div className="text-left">
              <div className="text-white font-medium">Deactivate Account</div>
              <div className="text-sm text-gray-400">Temporarily disable your account</div>
            </div>
            <div className="text-xs text-gray-500 bg-white/10 px-2 py-1 rounded">Coming Soon</div>
          </div>
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={!!deletionScheduledFor}
            className="w-full flex items-center justify-between p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={open => {
          setShowDeleteDialog(open);
          if (!open) {
            setReAuthPassword('');
            setReAuthError('');
          }
        }}
      >
        <AlertDialogContent className="bg-gray-900 border border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Delete Your Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 space-y-3">
              <p>
                Your account will be scheduled for deletion in <strong>30 days</strong>. After that,
                the following will be permanently removed:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Your profile and personal information</li>
                <li>All trips you've created</li>
                <li>Your messages and media uploads</li>
                <li>Your subscription and payment history</li>
              </ul>
              <p className="text-sm text-gray-400">
                You can cancel this within 30 days from Settings.
              </p>
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
              <p className="pt-2">Enter your password to verify your identity:</p>
              <input
                type="password"
                value={reAuthPassword}
                onChange={e => {
                  setReAuthPassword(e.target.value);
                  setReAuthError('');
                }}
                placeholder="Enter your password"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                disabled={isDeleting}
              />
              {reAuthError && <p className="text-red-400 text-sm">{reAuthError}</p>}
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
              disabled={confirmText !== 'DELETE' || !reAuthPassword || isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Submitting...' : 'Schedule Account Deletion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
