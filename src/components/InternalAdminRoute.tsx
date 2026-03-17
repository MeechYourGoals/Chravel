import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface InternalAdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for internal admin surfaces.
 * Requires authenticated user + super admin role.
 */
export function InternalAdminRoute({ children }: InternalAdminRouteProps) {
  const { user, isLoading } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
