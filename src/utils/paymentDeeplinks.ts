import { PaymentMethod } from '../types/receipts';
import { PAYMENT_METHOD_DISPLAY_NAMES } from '../types/paymentMethods';

export const generatePaymentDeeplink = (
  method: PaymentMethod,
  amount: number,
  recipientName: string
): string | null => {
  const formattedAmount = amount.toFixed(2);
  
  switch (method) {
    case 'venmo':
      // Venmo deeplink format
      return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(recipientName)}&amount=${formattedAmount}&note=${encodeURIComponent('Trip expense')}`;
    
    case 'cashapp':
      // Cash App deeplink format
      return `https://cash.app/$${encodeURIComponent(recipientName)}/${formattedAmount}`;
    
    case 'zelle':
      // Zelle doesn't have direct deeplinks, redirect to banking apps or web
      return `https://www.zellepay.com/send-money`;
    
    case 'paypal':
      // PayPal.Me deeplink format
      return `https://paypal.me/${encodeURIComponent(recipientName)}/${formattedAmount}`;
    
    case 'applecash':
      // Apple Cash is handled through iMessage, no direct web link
      return null;
    
    default:
      return null;
  }
};

export const getPaymentMethodDisplayName = (method: PaymentMethod | string): string => {
  const key = typeof method === 'string' ? method.toLowerCase() : String(method);
  return PAYMENT_METHOD_DISPLAY_NAMES[key] ?? method;
};
