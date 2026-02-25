import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Optional initial mode. Useful for deep links that want to land on Sign Up directly.
   * Defaults to 'signin' to preserve existing behavior.
   */
  initialMode?: 'signin' | 'signup';
}

export const AuthModal = ({ isOpen, onClose, initialMode }: AuthModalProps) => {
  const { signIn, signInWithGoogle, signUp, resetPassword, isLoading, user } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode ?? 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  // Track when we're waiting for auth state to update after successful sign-in
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close modal immediately if user is already authenticated when modal opens
  // Also close when user becomes authenticated after sign-in attempt
  useEffect(() => {
    if (user && isOpen) {
      // User is authenticated, close the modal immediately
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      setAwaitingAuth(false);
      onClose();
    }
  }, [user, isOpen, onClose]);

  // Safety timeout: if auth takes too long, still close the modal
  useEffect(() => {
    if (awaitingAuth) {
      closeTimeoutRef.current = setTimeout(() => {
        // Force close after 5 seconds even if user state hasn't updated
        // (defensive measure - auth state listener should have fired by now)
        setAwaitingAuth(false);
        onClose();
      }, 5000);

      return () => {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }
      };
    }
  }, [awaitingAuth, onClose]);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      let result;
      if (mode === 'signup') {
        result = await signUp(email, password, firstName, lastName);
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        setSuccess(result.success);
        return; // Keep modal open to show success message (sign-up confirmation)
      }

      // Sign-in successful - wait for auth state to update before closing
      // This prevents the "nothing happens" issue where modal closes before user state updates
      setAwaitingAuth(true);
    } catch (error) {
      console.error('Auth error:', error);
      setError('An unexpected error occurred');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await resetPassword(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setResetEmailSent(true);
    } catch (error) {
      console.error('Reset password error:', error);
      setError('An unexpected error occurred');
    }
  };

  const renderForgotPassword = () => (
    <div className="space-y-4">
      <button
        onClick={() => {
          setMode('signin');
          setResetEmailSent(false);
          setError('');
        }}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        <span className="text-sm">Back to Sign In</span>
      </button>

      {resetEmailSent ? (
        <div className="text-center space-y-4">
          <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-200">
            Check your email for a password reset link
          </div>
          <button
            onClick={() => {
              setMode('signin');
              setResetEmailSent(false);
            }}
            className="text-glass-orange hover:text-glass-yellow transition-colors"
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-2">Email</label>
            <div className="relative">
              <Mail
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                autoComplete="email"
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-glass-orange to-glass-yellow text-white font-medium py-3 rounded-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 min-h-[44px]"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </div>
  );

  const renderEmailForm = () => (
    <form onSubmit={handleEmailAuth} className="space-y-4 pb-2">
      {mode === 'signup' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="John"
                required
                autoComplete="given-name"
                inputMode="text"
                enterKeyHint="next"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange min-h-[48px]"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Doe"
                required
                autoComplete="family-name"
                inputMode="text"
                enterKeyHint="next"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange min-h-[48px]"
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-gray-300 text-sm mb-2">Email</label>
        <div className="relative">
          <Mail
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus={mode === 'signin'}
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange min-h-[48px]"
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-300 text-sm mb-2">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            enterKeyHint={mode === 'signup' ? 'done' : 'go'}
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-4 pr-10 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange min-h-[48px]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {mode === 'signin' && (
          <div className="flex justify-end items-center mt-2">
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setError('');
              }}
              className="text-xs text-glass-orange hover:text-glass-yellow transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || awaitingAuth}
        className="w-full bg-gradient-to-r from-glass-orange to-glass-yellow text-white font-medium py-3 rounded-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 min-h-[44px]"
      >
        {awaitingAuth
          ? 'Signing you in...'
          : isLoading
            ? 'Loading...'
            : mode === 'signup'
              ? 'Create Account'
              : 'Sign In'}
      </button>
    </form>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end tablet:items-center landscape:items-center justify-center p-0 tablet:p-4 landscape:p-4 animate-fade-in">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-t-3xl tablet:rounded-3xl landscape:rounded-3xl p-6 tablet:p-8 max-w-md w-full safe-bottom animate-slide-in-bottom tablet:animate-scale-in max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'forgot'
              ? 'Reset Password'
              : mode === 'signup'
                ? 'Create Account'
                : 'Welcome Back'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {success && (
          <div
            data-auth-message
            className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-200 text-sm animate-fade-in"
          >
            <p className="font-medium mb-1">✓ {success}</p>
            <p className="text-xs text-green-300/80 mt-1">
              You can close this and sign in once confirmed.
            </p>
          </div>
        )}

        {error && (
          <div
            data-auth-message
            className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm animate-fade-in"
          >
            <p className="font-medium mb-1">{error}</p>
            {error.includes('email') && (
              <p className="text-xs text-red-300/80 mt-1">
                Check your email for a confirmation link
              </p>
            )}
          </div>
        )}

        {/* Tab Navigation - Only show for signin/signup */}
        {mode !== 'forgot' && (
          <div className="flex rounded-lg bg-white/5 p-1 mb-6">
            <button
              onClick={() => {
                setMode('signin');
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {mode === 'forgot' ? (
          renderForgotPassword()
        ) : (
          <>
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={async () => {
                setGoogleLoading(true);
                setError('');
                const result = await signInWithGoogle();
                if (result.error) {
                  setError(result.error);
                  setGoogleLoading(false);
                }
                // If no error, browser will redirect to Google
              }}
              disabled={isLoading || googleLoading || awaitingAuth}
              className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 min-h-[48px] mb-4"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" className="flex-shrink-0">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
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
              )}
              <span>{googleLoading ? 'Redirecting…' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {renderEmailForm()}
          </>
        )}
      </div>
    </div>
  );
};
