import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'signin' | 'signup';

function getSafeReturnTo(value: string | null, fallback: string): string {
  if (!value) return fallback;
  // Only allow same-origin relative paths.
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  return value;
}

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  const returnTo = useMemo(() => {
    const fromQuery = searchParams.get('returnTo');
    // If caller used state, prefer it (more trustworthy).
    const fromState = (location.state as { returnTo?: string } | null)?.returnTo ?? null;
    return getSafeReturnTo(fromState ?? fromQuery, '/');
  }, [location.state, searchParams]);

  const mode = useMemo<AuthMode>(() => {
    const raw = searchParams.get('mode');
    return raw === 'signup' ? 'signup' : 'signin';
  }, [searchParams]);

  // Handle OAuth callback - check for hash fragment with access_token
  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const errorCode = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    // Also check URL params for error (some OAuth flows use query params)
    const urlError = searchParams.get('error');
    const urlErrorDescription = searchParams.get('error_description');
    
    if (errorCode || urlError) {
      console.error('[AuthPage] OAuth error:', errorCode || urlError, errorDescription || urlErrorDescription);
      // Clear the hash/params to prevent re-processing
      window.history.replaceState(null, '', '/auth');
      return;
    }
    
    if (accessToken) {
      console.log('[AuthPage] OAuth callback detected, processing session...');
      setIsProcessingOAuth(true);
      
      // The hash contains session tokens - Supabase client should automatically pick these up
      // Just wait for the auth state to update
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error('[AuthPage] Error getting session after OAuth:', error);
        } else if (session) {
          console.log('[AuthPage] Session established, redirecting to:', returnTo);
          // Clear the hash fragment before redirecting
          window.history.replaceState(null, '', '/auth');
        }
        setIsProcessingOAuth(false);
      });
    }
  }, [location.hash, searchParams, returnTo]);

  // If already authenticated, immediately go back.
  useEffect(() => {
    if (user && !authLoading && !isProcessingOAuth) {
      console.log('[AuthPage] User authenticated, redirecting to:', returnTo);
      navigate(returnTo, { replace: true });
    }
  }, [user, authLoading, isProcessingOAuth, navigate, returnTo]);

  // Show a loading state while processing OAuth
  if (isProcessingOAuth || (authLoading && location.hash.includes('access_token'))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthModal
        isOpen={true}
        initialMode={mode}
        onClose={() => navigate(returnTo, { replace: true })}
      />
    </div>
  );
};

export default AuthPage;

