/**
 * Onboarding Utilities
 *
 * Centralized logic for onboarding decisions.
 * This is the ONLY place where onboarding display logic should be determined.
 */

// Storage keys
const PENDING_INVITE_KEY = 'chravel_pending_invite_code';
const PENDING_DESTINATION_KEY = 'chravel_onboarding_pending_destination';

export interface OnboardingContext {
  user: { id: string } | null;
  hasCompletedOnboarding: boolean;
  isInitialized: boolean;
  isDemoMode: boolean;
}

/**
 * Determines if the onboarding tour should be shown.
 *
 * RULES:
 * 1. Demo mode → Use existing demo rules (no onboarding persistence)
 * 2. No authenticated user → false (can't show onboarding without auth)
 * 3. Authenticated user with hasCompletedOnboarding === true → false
 * 4. Authenticated user with hasCompletedOnboarding === false → true
 *
 * @returns true if onboarding should be displayed
 */
export function shouldShowOnboarding(context: OnboardingContext): boolean {
  const { user, hasCompletedOnboarding, isInitialized, isDemoMode } = context;

  // Not initialized yet - don't show until we know the state
  if (!isInitialized) {
    return false;
  }

  // Demo mode: let demo logic handle this (don't persist)
  if (isDemoMode) {
    return false;
  }

  // No authenticated user - can't show onboarding
  if (!user) {
    return false;
  }

  // Authenticated user who has completed onboarding - don't show
  if (hasCompletedOnboarding) {
    return false;
  }

  // First-time authenticated user - show onboarding
  return true;
}

/**
 * Captures the current pending deep link destination.
 * Call this BEFORE showing onboarding to preserve the user's intended destination.
 *
 * Handles:
 * - Pending invite codes (from /join/:token flow)
 * - Any other URL-based destination
 */
export function capturePendingDestination(currentPath: string): string | null {
  // Check for pending invite code first (highest priority)
  const pendingInviteCode = sessionStorage.getItem(PENDING_INVITE_KEY);
  if (pendingInviteCode) {
    return `/join/${pendingInviteCode}`;
  }

  // Check for paths that should be preserved
  const preservePaths = [
    /^\/trip\/[^/]+$/, // /trip/:id
    /^\/join\/[^/]+$/, // /join/:token
    /^\/tour\/pro\/[^/]+$/, // /tour/pro/:id
    /^\/event\/[^/]+$/, // /event/:id
    /^\/share\/[^/]+$/, // /share/:token (if exists)
  ];

  // Check if current path should be preserved
  for (const pattern of preservePaths) {
    if (pattern.test(currentPath)) {
      return currentPath;
    }
  }

  return null;
}

/**
 * Stores the pending destination for retrieval after onboarding.
 */
export function storePendingDestination(destination: string): void {
  sessionStorage.setItem(PENDING_DESTINATION_KEY, destination);
}

/**
 * Retrieves and clears the pending destination.
 */
export function retrievePendingDestination(): string | null {
  const destination = sessionStorage.getItem(PENDING_DESTINATION_KEY);
  if (destination) {
    sessionStorage.removeItem(PENDING_DESTINATION_KEY);
  }
  return destination;
}

/**
 * Clears the pending invite code (after it's been processed).
 */
export function clearPendingInviteCode(): void {
  sessionStorage.removeItem(PENDING_INVITE_KEY);
}

/**
 * Checks if there's a pending destination that should take priority.
 */
export function hasPendingDestination(): boolean {
  return !!(
    sessionStorage.getItem(PENDING_INVITE_KEY) || sessionStorage.getItem(PENDING_DESTINATION_KEY)
  );
}
