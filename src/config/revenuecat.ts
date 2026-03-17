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
  // Fallback: crypto exists but lacks randomUUID (e.g. some older WebView builds).
  // Guard crypto.getRandomValues separately — if crypto itself is absent the outer
  // condition already passed (typeof crypto !== 'undefined' was true).
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `anon_${hex}`;
  }
  // Last-resort fallback for environments with no Web Crypto API at all.
  // Not cryptographically secure, but preferable to a ReferenceError crash.
  return `anon_${Date.now().toString(36)}_${((Math.random() * 0xffffffff) >>> 0).toString(36)}`;
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

  const userId = getOrCreateUserId();
  Purchases.configure(REVENUECAT_API_KEY, userId);
  isInitialized = true;
};

/**
 * Returns the RevenueCat Purchases instance.
 * Must be called after initRevenueCat().
 */
export const getPurchases = (): typeof Purchases => Purchases;
