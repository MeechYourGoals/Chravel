
import React, { useState } from 'react';
import { X, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const { signIn, signInWithGoogle, signUp, resetPassword, isLoading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      
      onClose();
    } catch (error) {
      console.error('Auth error:', error);
      setError('An unexpected error occurred');
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
      }
      // Note: OAuth will redirect, so no need to close modal here
    } catch (error) {
      console.error('Google auth error:', error);
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
              <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
                autoComplete="given-name"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
                autoComplete="family-name"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-gray-300 text-sm mb-2">Email</label>
        <div className="relative">
          <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus={mode === 'signin'}
            autoComplete="email"
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-300 text-sm mb-2">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-4 pr-10 py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {mode === 'signin' && (
          <div className="flex justify-end mt-1">
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
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-glass-orange to-glass-yellow text-white font-medium py-3 rounded-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 min-h-[44px]"
      >
        {isLoading ? 'Loading...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
      </button>

      {/* Google Authentication */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white/10 px-2 text-gray-400">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-3 rounded-xl transition-colors active:scale-95 min-h-[44px]"
      >
        Sign in with Google
      </button>
    </form>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end tablet:items-center landscape:items-center justify-center p-0 tablet:p-4 landscape:p-4 animate-fade-in">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-t-3xl tablet:rounded-3xl landscape:rounded-3xl p-6 tablet:p-8 max-w-md w-full safe-bottom animate-slide-in-bottom tablet:animate-scale-in max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'forgot' ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
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

        {mode === 'forgot' ? renderForgotPassword() : renderEmailForm()}
      </div>
    </div>
  );
};
