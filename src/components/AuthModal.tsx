
import React, { useState } from 'react';
import { X, Mail, Phone, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const { signIn, signInWithPhone, signInWithGoogle, signInWithApple, signUp, isLoading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'phone'>('signin');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

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

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await signInWithPhone(phone);
      
      if (result.error) {
        setError(result.error);
        return;
      }
      
      // Show success message for OTP
      setError('Verification code sent to your phone!');
    } catch (error) {
      console.error('Phone auth error:', error);
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

  const handleAppleAuth = async () => {
    setError('');
    try {
      const result = await signInWithApple();
      if (result.error) {
        setError(result.error);
      }
      // Note: OAuth will redirect, so no need to close modal here
    } catch (error) {
      console.error('Apple auth error:', error);
      setError('An unexpected error occurred');
    }
  };

  const renderEmailForm = () => (
    <form onSubmit={handleEmailAuth} className="space-y-4">
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
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
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
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
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
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
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
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-4 pr-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-glass-orange to-glass-yellow text-white font-medium py-3 rounded-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 min-h-[44px]"
      >
        {isLoading ? 'Loading...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
      </button>

      {/* Social Authentication */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={handleGoogleAuth}
          className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-3 rounded-xl transition-colors active:scale-95 min-h-[44px]"
        >
          Google
        </button>
        <button
          type="button"
          onClick={handleAppleAuth}
          className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-3 rounded-xl transition-colors active:scale-95 min-h-[44px]"
        >
          Apple
        </button>
      </div>
    </form>
  );

  const renderPhoneForm = () => (
    <form onSubmit={handlePhoneAuth} className="space-y-4">
      <div>
        <label className="block text-gray-300 text-sm mb-2">Phone Number</label>
        <div className="relative">
          <Phone size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            required
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-glass-orange to-glass-yellow text-white font-medium py-3 rounded-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 min-h-[44px]"
      >
        {isLoading ? 'Sending...' : 'Send OTP'}
      </button>
    </form>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end tablet:items-center justify-center p-0 tablet:p-4 animate-fade-in">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-t-3xl tablet:rounded-3xl p-6 tablet:p-8 max-w-md w-full ios-safe-bottom animate-slide-in-bottom tablet:animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'phone' ? 'Sign in with Phone' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Auth Method Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
              mode === 'signin' || mode === 'signup' 
                ? 'bg-glass-orange text-white' 
                : 'bg-white/10 text-gray-300'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setMode('phone')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
              mode === 'phone' 
                ? 'bg-glass-orange text-white' 
                : 'bg-white/10 text-gray-300'
            }`}
          >
            Phone
          </button>
        </div>

        {mode === 'phone' ? renderPhoneForm() : renderEmailForm()}

        {mode !== 'phone' && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-glass-orange hover:text-glass-yellow transition-colors"
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
