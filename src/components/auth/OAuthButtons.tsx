import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * OAuth provider configuration via environment variables.
 * Set these in .env to control which providers are shown:
 *   VITE_OAUTH_GOOGLE_ENABLED=true
 *   VITE_OAUTH_APPLE_ENABLED=true
 *
 * Defaults to false (hidden) until you configure the providers in Supabase.
 */
export const OAUTH_CONFIG = {
  google: import.meta.env.VITE_OAUTH_GOOGLE_ENABLED === 'true',
  apple: import.meta.env.VITE_OAUTH_APPLE_ENABLED === 'true',
};

/** Returns true if any OAuth provider is enabled */
export const isOAuthEnabled = (): boolean => OAUTH_CONFIG.google || OAUTH_CONFIG.apple;

interface OAuthButtonsProps {
  /** Mode determines the CTA text ('Sign in with' vs 'Sign up with') */
  mode: 'signin' | 'signup';
  /** Disable buttons (e.g., during email/password submission) */
  disabled?: boolean;
  /**
   * Force show buttons regardless of OAUTH_CONFIG.
   * Used for testing and Storybook.
   * @internal
   */
  _forceShow?: boolean;
}

/**
 * OAuth provider buttons for Google and Apple sign-in.
 * Renders styled buttons that trigger Supabase OAuth flows.
 */
export const OAuthButtons: React.FC<OAuthButtonsProps> = ({
  mode,
  disabled = false,
  _forceShow = false,
}) => {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionText = mode === 'signup' ? 'Sign up with' : 'Sign in with';

  const handleGoogleAuth = async () => {
    if (disabled || loadingProvider) return;
    setError(null);
    setLoadingProvider('google');
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
        setLoadingProvider(null);
      }
      // On success, Supabase redirects the user - no need to clear loading state
    } catch (err) {
      setError('Failed to connect with Google. Please try again.');
      setLoadingProvider(null);
    }
  };

  const handleAppleAuth = async () => {
    if (disabled || loadingProvider) return;
    setError(null);
    setLoadingProvider('apple');
    try {
      const result = await signInWithApple();
      if (result.error) {
        setError(result.error);
        setLoadingProvider(null);
      }
      // On success, Supabase redirects the user - no need to clear loading state
    } catch (err) {
      setError('Failed to connect with Apple. Please try again.');
      setLoadingProvider(null);
    }
  };

  const isDisabled = disabled || loadingProvider !== null;

  // Check if any providers are enabled (or forced for testing)
  const hasAnyProvider = _forceShow || OAUTH_CONFIG.google || OAUTH_CONFIG.apple;

  // Don't render anything if no providers are configured
  if (!hasAnyProvider) {
    return null;
  }

  // Determine which providers to show
  const showGoogle = _forceShow || OAUTH_CONFIG.google;
  const showApple = _forceShow || OAUTH_CONFIG.apple;

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm animate-fade-in">
          {error}
        </div>
      )}

      {/* Google Button - only show if enabled */}
      {showGoogle && (
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isDisabled}
          aria-label={`${actionText} Google`}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
        >
          {loadingProvider === 'google' ? (
            <LoadingSpinner />
          ) : (
            <>
              <GoogleIcon />
              <span>{actionText} Google</span>
            </>
          )}
        </button>
      )}

      {/* Apple Button - only show if enabled */}
      {showApple && (
        <button
          type="button"
          onClick={handleAppleAuth}
          disabled={isDisabled}
          aria-label={`${actionText} Apple`}
          className="w-full flex items-center justify-center gap-3 bg-black text-white font-medium py-3 px-4 rounded-xl hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] border border-white/20"
        >
          {loadingProvider === 'apple' ? (
            <LoadingSpinner light />
          ) : (
            <>
              <AppleIcon />
              <span>{actionText} Apple</span>
            </>
          )}
        </button>
      )}
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

/** Apple logo SVG */
const AppleIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

/** Loading spinner component */
const LoadingSpinner: React.FC<{ light?: boolean }> = ({ light }) => (
  <svg
    className={`animate-spin h-5 w-5 ${light ? 'text-white' : 'text-gray-900'}`}
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
