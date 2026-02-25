/**
 * Utility Functions for PDF Export
 */

import type { PaymentItem } from './types.ts';

/**
 * Calculate net settlement between all participants
 * Returns a human-readable string like "Chris pays Jamal $125, DeShawn pays Jamal $125"
 */
export function calculateNetSettlement(payments: PaymentItem[]): string {
  if (!payments || payments.length === 0) return '';

  // Build balance map: who owes what (negative = owes, positive = owed)
  const balances = new Map<string, number>();

  payments.forEach(payment => {
    // Payer is owed the full amount
    balances.set(payment.payer, (balances.get(payment.payer) || 0) + payment.amount);

    // Each debtor owes their split
    payment.split.forEach(split => {
      if (!split.paid) {
        balances.set(split.name, (balances.get(split.name) || 0) - split.owes);
      }
    });
  });

  // Separate debtors and creditors
  const debtors: [string, number][] = [];
  const creditors: [string, number][] = [];

  balances.forEach((balance, person) => {
    if (balance < -0.01) {
      debtors.push([person, -balance]); // Convert to positive
    } else if (balance > 0.01) {
      creditors.push([person, balance]);
    }
  });

  if (debtors.length === 0 || creditors.length === 0) {
    return 'All payments settled';
  }

  // Sort by amount for efficient matching
  debtors.sort((a, b) => b[1] - a[1]);
  creditors.sort((a, b) => b[1] - a[1]);

  // Calculate optimal settlements
  const settlements: string[] = [];
  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const [debtor, debtAmount] = debtors[i];
    const [creditor, creditAmount] = creditors[j];

    const settleAmount = Math.min(debtAmount, creditAmount);
    settlements.push(`${debtor} pays ${creditor} $${settleAmount.toFixed(2)}`);

    debtors[i][1] -= settleAmount;
    creditors[j][1] -= settleAmount;

    if (debtors[i][1] < 0.01) i++;
    if (creditors[j][1] < 0.01) j++;
  }

  return settlements.join(', ');
}

/**
 * Create URL-safe slug from string
 */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Format timestamp as YYYYMMDD_HHmm
 */
export function formatTimestamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
}

/**
 * Format date as "Mon, Oct 27"
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date as "Oct 27, 2025"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time as "2:26 PM"
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format datetime as "Oct 27, 2025 2:26 PM"
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
