/**
 * Currency Service
 * Handles currency conversion and exchange rate management
 */

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}

// Cache for exchange rates (in-memory, expires after 1 hour)
const exchangeRateCache = new Map<string, { rate: number; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Get exchange rate between two currencies
 * Uses a free API (exchangerate-api.com) or fallback rates
 */
export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  // Same currency
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const cacheKey = `${fromCurrency}_${toCurrency}`;
  const cached = exchangeRateCache.get(cacheKey);

  // Check cache
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rate;
  }

  try {
    // Try to fetch from free API (exchangerate-api.com)
    // Note: In production, use a paid API like Fixer.io or CurrencyLayer for better reliability
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rate = data.rates[toCurrency];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    // Cache the rate
    exchangeRateCache.set(cacheKey, {
      rate,
      timestamp: Date.now(),
    });

    return rate;
  } catch (error) {
    console.warn('Failed to fetch exchange rate, using fallback:', error);

    // Fallback to hardcoded rates (updated periodically)
    // These are approximate rates - in production, use a reliable API
    const fallbackRates: Record<string, Record<string, number>> = {
      USD: {
        EUR: 0.92,
        GBP: 0.79,
        CAD: 1.35,
        JPY: 150.0,
      },
      EUR: {
        USD: 1.09,
        GBP: 0.86,
        CAD: 1.47,
        JPY: 163.0,
      },
      GBP: {
        USD: 1.27,
        EUR: 1.16,
        CAD: 1.71,
        JPY: 190.0,
      },
      CAD: {
        USD: 0.74,
        EUR: 0.68,
        GBP: 0.58,
        JPY: 111.0,
      },
    };

    const fallbackRate = fallbackRates[fromCurrency]?.[toCurrency];

    if (fallbackRate) {
      // Cache fallback rate (shorter cache duration)
      exchangeRateCache.set(cacheKey, {
        rate: fallbackRate,
        timestamp: Date.now() - CACHE_DURATION * 0.5, // Expire sooner
      });

      return fallbackRate;
    }

    // Last resort: return 1 (no conversion)
    console.error(`No exchange rate available for ${fromCurrency} to ${toCurrency}`);
    return 1;
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

/**
 * Normalize all amounts to a base currency (default: USD)
 */
export async function normalizeToBaseCurrency(
  amounts: Array<{ amount: number; currency: string }>,
  baseCurrency: string = 'USD',
): Promise<
  Array<{ amount: number; currency: string; originalAmount: number; originalCurrency: string }>
> {
  const conversions = await Promise.all(
    amounts.map(async ({ amount, currency }) => {
      const normalizedAmount = await convertCurrency(amount, currency, baseCurrency);
      return {
        amount: normalizedAmount,
        currency: baseCurrency,
        originalAmount: amount,
        originalCurrency: currency,
      };
    }),
  );

  return conversions;
}

/**
 * Get supported currencies
 */
export function getSupportedCurrencies(): string[] {
  return ['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD', 'CHF', 'CNY'];
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

/**
 * Clear exchange rate cache
 */
export function clearExchangeRateCache(): void {
  exchangeRateCache.clear();
}
