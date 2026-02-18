export type PaymentMethodId = 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'applecash';

export interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
}

/** Single source of truth for payment method options (id + label) */
export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { id: 'venmo', label: 'Venmo' },
  { id: 'cashapp', label: 'Cash App' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'applecash', label: 'Apple Cash' },
];

/** Display names for payment method types (including DB variants like applepay) */
export const PAYMENT_METHOD_DISPLAY_NAMES: Record<string, string> = {
  venmo: 'Venmo',
  cashapp: 'Cash App',
  zelle: 'Zelle',
  paypal: 'PayPal',
  applecash: 'Apple Cash',
  applepay: 'Apple Pay',
  cash: 'Cash',
  other: 'Other',
};
