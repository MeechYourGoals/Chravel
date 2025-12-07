import { useAuth } from './useAuth';
import { useMemo } from 'react';
import { SUPER_ADMIN_EMAILS } from '../constants/admins';

// Export for backward compatibility if needed, but better to use from constants
export { SUPER_ADMIN_EMAILS } from '../constants/admins';

export const useSuperAdmin = () => {
  const { user } = useAuth();

  const isSuperAdmin = useMemo(() => {
    if (!user?.email) return false;
    return SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
  }, [user?.email]);

  return { isSuperAdmin };
};

// Standalone check function for non-hook contexts
export const checkIsSuperAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
};
