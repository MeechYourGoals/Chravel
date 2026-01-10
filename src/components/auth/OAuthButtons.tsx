import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * OAuth is temporarily disabled while backend configuration is being fixed.
 * TODO: Re-enable once Google OAuth is properly configured in Supabase.
 */
export const isOAuthEnabled = (): boolean => {
  return false;
};

interface OAuthButtonsProps {
  /** Mode determines the CTA text ('Sign in with' vs 'Sign up with') */
  mode: 'signin' | 'signup';
  /** Disable buttons (e.g., during email/password submission) */
  disabled?: boolean;
}

/**
 * Google OAuth button for sign-in/sign-up.
 * Renders a styled button that triggers Supabase Google OAuth flow.
 */
export const OAuthButtons: React.FC<OAuthButtonsProps> = ({ mode, disabled = false }) => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionText = mode === 'signup' ? 'Sign up with' : 'Sign in with';

  const handleGoogleAuth = async () => {
    if (disabled || isLoading) return;
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
      }
      // On success, Supabase redirects the user - no need to clear loading state
    } catch (err) {
      setError('Failed to connect with Google. Please try again.');
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isDisabled}
        aria-label={`${actionText} Google`}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <GoogleIcon />
            <span>{actionText} Google</span>
          </>
        )}
      </button>
    </div>
  );
};

/** Google "G" logo SVG */
const GoogleIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/** Loading spinner component */
const LoadingSpinner: React.FC = () => (
  <svg
    className="animate-spin h-5 w-5 text-gray-900"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export default OAuthButtons;
