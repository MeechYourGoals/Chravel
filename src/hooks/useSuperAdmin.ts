import { useAuth } from './useAuth';
import { useMemo } from 'react';

// Super admin emails list - centralized
export const SUPER_ADMIN_EMAILS = ['ccamechi@gmail.com'];

export const useSuperAdmin = () => {
  const { user } = useAuth();

  const isSuperAdmin = useMemo(() => {
    if (!user?.email) return false;
    return SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
  }, [user?.email]);

  return { isSuperAdmin };
};

// Standalone check function for non-hook contexts
export const checkIsSuperAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
};
