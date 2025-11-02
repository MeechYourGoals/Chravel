/**
 * Utility functions for consistent avatar display across the application
 */

/**
 * Extracts initials from a person's name
 * @param name - Full name of the person
 * @returns Two-letter initials (first and last name)
 */
export const getInitials = (name: string): string => {
  if (!name || typeof name !== 'string') return 'U';
  
  const names = name.trim().split(' ').filter(Boolean);
  
  if (names.length === 0) return 'U';
  if (names.length === 1) return names[0][0].toUpperCase();
  
  // First and last name initials
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

/**
 * Checks if an avatar URL is likely to be valid
 * @param avatarUrl - The avatar URL to check
 * @returns boolean indicating if URL appears valid
 */
export const isValidAvatarUrl = (avatarUrl?: string | null): boolean => {
  if (!avatarUrl) return false;
  
  // Accept local paths starting with '/'
  if (avatarUrl.startsWith('/')) return true;
  
  // Check for valid URL format and common image extensions
  try {
    const url = new URL(avatarUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Generates a consistent, deterministic avatar for a given name
 * Uses initials and a color derived from the name hash
 * @param name - Full name of the person
 * @returns URL to a consistent avatar image
 */
export const getConsistentAvatar = (name: string): string => {
  if (!name || typeof name !== 'string') return 'https://ui-avatars.com/api/?name=U&background=64748b&color=fff&size=128&bold=true';
  
  const initials = getInitials(name);
  
  // Generate consistent background color from name hash
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['3b82f6', '8b5cf6', 'ec4899', 'f59e0b', '10b981', 'ef4444', '06b6d4', 'a855f7'];
  const bg = colors[hash % colors.length];
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=fff&size=128&bold=true`;
};