/**
 * Currency Constants
 *
 * Comprehensive list of supported currencies for multi-currency payments
 * Includes currency codes, symbols, and formatting information
 */

export interface Currency {
  code: string; // ISO 4217 code
  symbol: string; // Currency symbol
  name: string; // Full name
  decimalPlaces: number; // Number of decimal places
}

export const CURRENCIES: Currency[] = [
  // Major Currencies
  { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalPlaces: 0 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimalPlaces: 2 },

  // North America
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2 },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', decimalPlaces: 2 },

  // Asia-Pacific
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimalPlaces: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimalPlaces: 2 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimalPlaces: 2 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimalPlaces: 0 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimalPlaces: 2 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', decimalPlaces: 2 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimalPlaces: 2 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimalPlaces: 2 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimalPlaces: 0 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', decimalPlaces: 0 },

  // Europe
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimalPlaces: 2 },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimalPlaces: 2 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimalPlaces: 2 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimalPlaces: 2 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', decimalPlaces: 2 },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', decimalPlaces: 2 },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', decimalPlaces: 0 },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', decimalPlaces: 2 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', decimalPlaces: 2 },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', decimalPlaces: 2 },

  // Middle East & Africa
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimalPlaces: 2 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimalPlaces: 2 },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', decimalPlaces: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimalPlaces: 2 },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', decimalPlaces: 2 },

  // South America
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimalPlaces: 2 },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', decimalPlaces: 2 },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', decimalPlaces: 0 },
  { code: 'COP', symbol: '$', name: 'Colombian Peso', decimalPlaces: 0 },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', decimalPlaces: 2 },

  // Cryptocurrencies (for modern travelers)
  { code: 'BTC', symbol: '₿', name: 'Bitcoin', decimalPlaces: 8 },
  { code: 'ETH', symbol: 'Ξ', name: 'Ethereum', decimalPlaces: 8 },
];

/**
 * Get currency by code
 */
export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES.find(c => c.code === code);
}

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  if (!currency) {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }

  const formatted = amount.toFixed(currency.decimalPlaces);

  // For some currencies, symbol goes after
  if (['SEK', 'NOK', 'DKK', 'CZK', 'HUF', 'PLN', 'RON'].includes(currency.code)) {
    return `${formatted} ${currency.symbol}`;
  }

  return `${currency.symbol}${formatted}`;
}

/**
 * Get popular currencies for quick selection
 */
export const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'MXN', 'BRL'
];

/**
 * Group currencies by region
 */
export const CURRENCY_REGIONS = {
  'North America': ['USD', 'CAD', 'MXN'],
  'Europe': ['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY', 'RUB'],
  'Asia-Pacific': ['JPY', 'CNY', 'AUD', 'NZD', 'SGD', 'HKD', 'KRW', 'INR', 'THB', 'PHP', 'MYR', 'IDR', 'VND'],
  'Middle East & Africa': ['AED', 'SAR', 'ILS', 'ZAR', 'EGP'],
  'South America': ['BRL', 'ARS', 'CLP', 'COP', 'PEN'],
  'Cryptocurrency': ['BTC', 'ETH']
};
