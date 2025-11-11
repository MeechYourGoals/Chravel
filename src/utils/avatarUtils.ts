/**
 * Utility functions for consistent avatar display across the application
 * 
 * Enhanced for production MVP with:
 * - SVG-based default avatar generation (no external API dependency)
 * - Consistent color generation from name hash
 * - Improved initials extraction
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
  
  // Accept data URIs (for SVG avatars)
  if (avatarUrl.startsWith('data:')) return true;
  
  // Check for valid URL format and common image extensions
  try {
    const url = new URL(avatarUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Generates a consistent background color from a name hash
 * @param name - Name to generate color from
 * @returns Hex color code (without #)
 */
const generateColorFromName = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    '3b82f6', // blue
    '8b5cf6', // purple
    'ec4899', // pink
    'f59e0b', // amber
    '10b981', // emerald
    'ef4444', // red
    '06b6d4', // cyan
    'a855f7', // violet
    'f97316', // orange
    '14b8a6', // teal
  ];
  return colors[hash % colors.length];
};

/**
 * Generates a default avatar as an SVG data URI
 * Creates a consistent, deterministic avatar based on initials and name hash
 * @param name - Full name of the person
 * @param size - Size of the avatar (default: 128)
 * @returns Data URI string for SVG avatar
 */
export const generateDefaultAvatar = (name: string, size: number = 128): string => {
  if (!name || typeof name !== 'string') {
    name = 'User';
  }
  
  const initials = getInitials(name);
  const bgColor = generateColorFromName(name);
  
  // Create SVG with initials
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#${bgColor}" rx="${size / 2}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="${size * 0.4}" 
        font-weight="bold" 
        fill="#ffffff" 
        text-anchor="middle" 
        dominant-baseline="central"
      >
        ${initials}
      </text>
    </svg>
  `.trim();
  
  // Convert to data URI
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Generates a consistent, deterministic avatar for a given name
 * Uses initials and a color derived from the name hash
 * Falls back to SVG generation for offline/production use
 * @param name - Full name of the person
 * @returns URL to a consistent avatar image (SVG data URI or external API)
 */
export const getConsistentAvatar = (name: string): string => {
  // Use SVG generation for production (no external API dependency)
  return generateDefaultAvatar(name);
};