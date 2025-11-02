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