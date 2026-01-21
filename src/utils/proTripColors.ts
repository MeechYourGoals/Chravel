/**
 * Deterministic color palette for Pro Trip cards
 * Each trip ID maps to a stable color that doesn't change on re-render
 */

export interface ProTripColor {
  /** Tailwind gradient classes for the card background */
  cardGradient: string;
  /** Accent color name for matching elements */
  accent: string;
}

// Vibrant color palette - works well as full-card backgrounds with white text
const PRO_TRIP_COLORS: ProTripColor[] = [
  { cardGradient: 'from-red-700/90 via-red-800/85 to-red-900/90', accent: 'red' },
  { cardGradient: 'from-amber-600/90 via-amber-700/85 to-amber-800/90', accent: 'amber' },
  { cardGradient: 'from-blue-700/90 via-blue-800/85 to-blue-900/90', accent: 'blue' },
  { cardGradient: 'from-purple-700/90 via-purple-800/85 to-purple-900/90', accent: 'purple' },
  { cardGradient: 'from-emerald-700/90 via-emerald-800/85 to-emerald-900/90', accent: 'emerald' },
  { cardGradient: 'from-rose-700/90 via-rose-800/85 to-rose-900/90', accent: 'rose' },
  { cardGradient: 'from-cyan-700/90 via-cyan-800/85 to-cyan-900/90', accent: 'cyan' },
  { cardGradient: 'from-indigo-700/90 via-indigo-800/85 to-indigo-900/90', accent: 'indigo' },
];

/**
 * Simple hash function to convert a string to a number
 * Produces consistent results for the same input
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a deterministic color for a Pro Trip based on its ID
 * The same trip ID will always return the same color
 * 
 * @param tripId - The unique identifier for the trip (string or number)
 * @returns ProTripColor object with gradient and accent color
 */
export function getProTripColor(tripId: string | number): ProTripColor {
  const idString = String(tripId);
  const hash = hashString(idString);
  const index = hash % PRO_TRIP_COLORS.length;
  return PRO_TRIP_COLORS[index];
}

/**
 * Get all available Pro Trip colors (for documentation/testing)
 */
export function getAllProTripColors(): ProTripColor[] {
  return [...PRO_TRIP_COLORS];
}
