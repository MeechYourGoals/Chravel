import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hapticService } from '@/services/hapticService';

interface AuthPromptBannerProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

/**
 * iOS-style persistent authentication banner
 * Appears at top of screen for unauthenticated users
 * Dismissible with localStorage persistence
 */
export const AuthPromptBanner = ({ onSignIn, onSignUp }: AuthPromptBannerProps) => {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissal
  useEffect(() => {
    const dismissed = localStorage.getItem('auth-banner-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  // Don't show if user is authenticated or banner was dismissed
  if (user || isDismissed) return null;

  const handleDismiss = async () => {
    await hapticService.light();
    localStorage.setItem('auth-banner-dismissed', 'true');
    setIsDismissed(true);
  };

  const handleSignIn = async () => {
    await hapticService.medium();
    onSignIn();
  };

  const handleSignUp = async () => {
    await hapticService.medium();
    onSignUp();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] animate-slide-in-bottom safe-area-top">
      <div className="bg-gradient-to-r from-primary/95 to-accent/95 backdrop-blur-xl border-b border-white/20 shadow-mobile-nav">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Sign in to create trips and save your plans
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleSignUp}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-primary rounded-lg font-medium text-sm transition-all active:scale-95 min-h-[36px] shadow-sm"
              >
                <UserPlus size={16} />
                <span className="hidden xs:inline">Sign Up</span>
              </button>

              <button
                onClick={handleSignIn}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg font-medium text-sm transition-all active:scale-95 min-h-[36px]"
              >
                <LogIn size={16} />
                <span className="hidden xs:inline">Sign In</span>
              </button>

              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="p-2 text-white/80 hover:text-white transition-colors active:scale-95 min-h-[36px] min-w-[36px]"
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
