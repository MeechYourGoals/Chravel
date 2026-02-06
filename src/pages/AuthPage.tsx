import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/hooks/useAuth';

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

  // If already authenticated, immediately go back.
  useEffect(() => {
    if (user && !authLoading) {
      navigate(returnTo, { replace: true });
    }
  }, [user, authLoading, navigate, returnTo]);

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

