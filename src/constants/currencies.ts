/**
 * Currency Constants
 *
 * MVP: Top 10 fiat currencies + Bitcoin for multi-currency payments.
 * Kept minimal for launch; can expand based on usage.
 */

export interface Currency {
  code: string; // ISO 4217 code
  symbol: string; // Currency symbol
  name: string; // Full name
  decimalPlaces: number; // Number of decimal places
}

/** Top 10 fiat currencies by global usage + Bitcoin */
export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalPlaces: 0 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimalPlaces: 2 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimalPlaces: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimalPlaces: 2 },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', decimalPlaces: 2 },
  { code: 'BTC', symbol: '₿', name: 'Bitcoin', decimalPlaces: 8 },
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

/** Quick-access subset for CurrencySelector (first 6 fiat) */
export const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

/**
 * Group currencies for selector UI
 */
export const CURRENCY_REGIONS = {
  Fiat: ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CNY', 'CAD', 'AUD', 'INR', 'MXN'],
  Cryptocurrency: ['BTC'],
};
