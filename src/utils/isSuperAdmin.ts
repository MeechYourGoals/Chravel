/**
 * Canonical Super Admin Check
 * 
 * Single source of truth for determining if a user is a super admin.
 * Super admins get unlimited access to all features.
 */

import { SUPER_ADMIN_EMAILS } from '@/constants/admins';

/**
 * Check if an email belongs to a super admin
 */
export const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
};

/**
 * Check if user has super admin role
 */
export const hasSuperAdminRole = (roles?: string[]): boolean => {
  if (!roles || roles.length === 0) return false;
  const superAdminRoles = ['enterprise_admin', 'super_admin'];
  return roles.some(role => superAdminRoles.includes(role.toLowerCase()));
};

/**
 * Comprehensive super admin check - use this as the primary check
 */
export const isSuperAdmin = (params: {
  email?: string | null;
  roles?: string[];
  appRole?: string | null;
}): boolean => {
  const { email, roles, appRole } = params;
  
  // Email allowlist is the failsafe (founder protection)
  if (isSuperAdminEmail(email)) return true;
  
  // Role-based check from user_roles table
  if (hasSuperAdminRole(roles)) return true;
  
  // Legacy app_role check (for backward compatibility)
  if (appRole === 'super_admin' || appRole === 'enterprise_admin') return true;
  
  return false;
};
