import { Purchases } from '@revenuecat/purchases-js';

const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY || '';

/**
 * Generates a unique anonymous user ID for RevenueCat.
 * Uses crypto.randomUUID if available, falls back to timestamp + random.
 */
const generateAnonymousUserId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `anon_${crypto.randomUUID()}`;
  }
  // Fallback for older browsers
  return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Gets or creates an anonymous user ID, persisting it in localStorage.
 */
const getOrCreateUserId = (): string => {
  const STORAGE_KEY = 'revenuecat_user_id';

  try {
    const existingId = localStorage.getItem(STORAGE_KEY);
    if (existingId) {
      return existingId;
    }

    const newId = generateAnonymousUserId();
    localStorage.setItem(STORAGE_KEY, newId);
    return newId;
  } catch {
    // localStorage unavailable (e.g., private browsing)
    return generateAnonymousUserId();
  }
};

let isInitialized = false;

/**
 * Initializes RevenueCat SDK with anonymous user ID.
 * Safe to call multiple times - will only initialize once.
 */
export const initRevenueCat = async (): Promise<void> => {
  if (isInitialized) {
    console.log('[RevenueCat] Already initialized');
    return;
  }

  try {
    const userId = getOrCreateUserId();
    // RevenueCat initialization (user ID redacted from logs)

    Purchases.configure(REVENUECAT_API_KEY, userId);
    isInitialized = true;

    // RevenueCat SDK initialized
  } catch (error) {
    console.error('[RevenueCat] Failed to initialize:', error);
    throw error;
  }
};

/**
 * Returns the RevenueCat Purchases instance.
 * Must be called after initRevenueCat().
 */
export const getPurchases = (): typeof Purchases => {
  if (!isInitialized) {
    console.warn('[RevenueCat] SDK not initialized. Call initRevenueCat() first.');
  }
  return Purchases;
};
