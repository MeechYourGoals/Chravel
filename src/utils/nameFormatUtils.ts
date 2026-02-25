/**
 * Format participant name based on trip type
 * Consumer: "First LastInitial." (e.g., "Marcus J.")
 * Enterprise/Pro: Full name (initials shown in avatar only)
 */

export const formatCollaboratorName = (
  fullName: string,
  tripType: 'consumer' | 'pro' | 'event',
): string => {
  if (!fullName || typeof fullName !== 'string') return 'Unknown';

  const nameParts = fullName.trim().split(' ').filter(Boolean);

  if (nameParts.length === 0) return 'Unknown';
  if (nameParts.length === 1) return nameParts[0]; // Single name, return as-is

  // For consumer trips: "FirstName LastInitial."
  if (tripType === 'consumer') {
    const firstName = nameParts[0];
    const lastInitial = nameParts[nameParts.length - 1][0].toUpperCase();
    return `${firstName} ${lastInitial}.`;
  }

  // For pro/enterprise trips: Full name (will be shown only on hover)
  return fullName;
};

export const shouldShowFullNameInAvatar = (tripType: 'consumer' | 'pro' | 'event'): boolean => {
  // Pro/enterprise trips show initials only in avatar
  return tripType === 'consumer';
};
