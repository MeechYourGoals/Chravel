import { Purchases } from '@revenuecat/purchases-js';
import { isLovablePreview } from '@/utils/env';

const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY || '';

/**
 * RevenueCat Web Billing keys use the rcb_ prefix.
 * Native app keys (appl_/goog_/amaz_/stripe_) will throw if passed to purchases-js.
 */
export const canInitializeRevenueCat = (
  apiKey: string = REVENUECAT_API_KEY,
  preview: boolean = isLovablePreview(),
): boolean => {
  if (preview) return false;

  const normalizedKey = apiKey.trim();
  if (!normalizedKey) return false;

  return normalizedKey.startsWith('rcb_');
};

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
  if (isInitialized || !canInitializeRevenueCat()) {
    return;
  }

  try {
    const userId = getOrCreateUserId();
    Purchases.configure(REVENUECAT_API_KEY, userId);
    isInitialized = true;
  } catch (error) {
    throw error;
  }
};

/**
 * Returns the RevenueCat Purchases instance.
 * Must be called after initRevenueCat().
 */
export const getPurchases = (): typeof Purchases => Purchases;
